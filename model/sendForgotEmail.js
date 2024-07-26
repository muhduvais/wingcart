const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

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
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: email,
            subject: 'Password Reset',
            text: `http://localhost:3001/resetForgotPass?email=${email}`
        };

        await transporter.sendMail(mailOptions);

    } catch (err) {
        console.log("Error sending mail", err);
    }
  }

  module.exports = sendForgotEmail;

