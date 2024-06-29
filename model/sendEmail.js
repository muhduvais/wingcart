const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const generateOtp = require("./generateOtp");

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

  const sendEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: email,
            subject: 'Verify your email address',
            text: `Your OTP for email verification is: ${otp}.`
        };

        await transporter.sendMail(mailOptions);

    } catch (err) {
        console.log("Error sending mail", err);
    }
  }

  module.exports = sendEmail;

