const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');

const generateResetToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

dotenv.config();

let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const sendForgotEmail = async (email) => {
    try {
      const token = generateResetToken(email);
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: 'www.muvaisthennala110@gmail.com',
            subject: 'Password Reset',
            text: `${process.env.RESET_PASSWORD_URL}?token=${token}`
        };

        await transporter.sendMail(mailOptions);

    } catch (err) {
        console.log("Error sending mail", err);
    }
  }

  module.exports = sendForgotEmail;

