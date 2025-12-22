const mongoose = require('mongoose');

module.exports = mongoose.model(
  'login',
  new mongoose.Schema({
    userName: { type: String, unique: true },
    emailId: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    // 🔐 Forgot password fields
    resetOtpHash: String,
    resetOtpExpires: Date
  }, { timestamps: true })
);
