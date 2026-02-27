const nodemailer = require('nodemailer');

// Gmail Setup (Recommended for testing)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Your Gmail address
    pass: process.env.EMAIL_PASSWORD   // Gmail App Password (NOT regular password)
  }
});

// Or use other providers like Brevo, SendGrid, etc.

module.exports = transporter;