// const nodemailer = require('nodemailer');
// require('dotenv').config(); // Ensure dotenv is loaded to use environment variables

// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     secure: false, // true for 465, false for other ports (587 or 25)
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// module.exports = transporter;
const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure environment variables are loaded

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,  // Default to 587 for non-SSL (STARTTLS) connections
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587/25 (non-SSL)
    auth: {
        user: process.env.EMAIL_USER, // Ensure these are in your .env file
        pass: process.env.EMAIL_PASS  // Ensure these are in your .env file
    }
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log('Error configuring Nodemailer: ', error);
    } else {
        console.log('Nodemailer is ready to send emails');
    }
});

module.exports = transporter;
