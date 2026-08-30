const mongoose = require('mongoose');

module.exports = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      userName: { type: String, required: true },
      phoneNumber: { type: String },
      gstNumber: { type: String, uppercase: true, trim: true },
      emailId: { type: String },
      address: { type: String }
    },
    { timestamps: true }
  )
);
