const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LoginModel = require('../models/login');

exports.register = async (req, res) => {
  try{
  const { userName, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await LoginModel.create({ userName: userName, password: hash });
  res.json({ message: 'Registered' });
  console.log('Registered');
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', errors: err.issues });
    if (err.code === 11000) return res.status(400).json({ message: 'Username already exists' });
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