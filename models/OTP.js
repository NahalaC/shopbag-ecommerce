const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiry: { type: Date, required: true }
});

const OTPModel = mongoose.model('OTPModel', otpSchema);
module.exports = OTPModel;
