const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LoginModel = require('../models/login');
const { generateOtp, hashOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const crypto = require('crypto');

exports.register = async (req, res) => {
  try{
  const { userName, emailId,password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await LoginModel.create({ userName: userName, emailId: emailId, password: hash });
  res.json({ message: 'Registered' });
  console.log('Registered');
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.issues });
    if (err.code === 11000) return res.status(400).json({ message: 'Username or email already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
   const { userName, password } = req.body;
    console.log('[LOGIN] Payload:', userName, password); // ✅ log input
    const login = await LoginModel.findOne({ userName });
    console.log('[LOGIN] Retrieved:', login); // ✅ log output
    if (!login) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, login.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
 
    const token = jwt.sign(
    { id: login._id },
    process.env.JWT_SECRET
  );

    res.json({
    token,
    user: {
      id: login._id,
      userName: login.userName
    }
  });

  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.issues });
    return res.status(500).json({ message: 'Server error' });
  }
}


exports.forgotPassword = async (req, res) => {
  try {
    const { emailId } = req.body;

    const user = await LoginModel.findOne({ emailId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOtp();
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    await sendOtpEmail(emailId, otp);

    res.json({ message: 'OTP sent to email' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { emailId, otp, newPassword } = req.body;

    const user = await LoginModel.findOne({ emailId });
    if (!user) return res.status(400).json({ message: 'Invalid request' });

    if (!user.resetOtpExpires || user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    if (hashedOtp !== user.resetOtpHash) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtpHash = null;
    user.resetOtpExpires = null;

    await user.save();

    res.json({ message: 'Password updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Reset failed' });
  }
};

// gmail app pswd to use
// https://myaccount.google.com/apppasswords?rapt=AEjHL4NtAdH8Sn_GpvtL_71pYSQXF1RyPexmNb59ueHcsB9VWBAMAGVdrI5Ps_snoLCtBNylF3fP44rnJvPvwLrYO8Mf2g8Be3IfHEQhKNykMoL5c7BqKwo