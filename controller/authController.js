const User = require("../model/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../model/sendEmail");
const sendForgotEmail = require("../model/sendForgotEmail");
const generateOtp = require("../model/generateOtp");
const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");
require("dotenv").config();

const userLogin = (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    successMsg = req.query.successMsg;
    res.render("login", { successMsg });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    console.log("L User: ", user);

    if (!user) {
      res.status(STATUS.UNAUTHORIZED).json({ message: MESSAGES.AUTH.INVALID_CREDENTIALS });
      return;
    }

    if (user.isBlocked) {
      res.status(STATUS.FORBIDDEN).json({
        message: MESSAGES.AUTH.ACCESS_BLOCKED,
      });
      return;
    }

    const comparePass = await bcrypt.compare(password, user.password);

    console.log("Compare pass: ", comparePass);

    if (!comparePass) {
      res.status(STATUS.OK).json({ message: MESSAGES.AUTH.INVALID_CREDENTIALS });
      return;
    }
    req.session.user = user._id;
    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_LOGIN_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const signup = (req, res) => {
  let formData = req.session.signupData || {};
  console.log(formData);
  res.render("signup", { formData });
};

const verifySignup = async (req, res) => {
  try {
    const { fname, lname, age, phone, email, password } = req.body;

    const existingEmail = await User.findOne({ email });
    const existingPhone = await User.findOne({ phone });

    if (existingEmail) {
      res.render("signup", {
        signupMessage: MESSAGES.AUTH.EMAIL_REGISTERED,
        formData: { fname, lname, age, phone, email },
      });
      return;
    } else if (existingPhone) {
      res.render("signup", {
        signupMessage: MESSAGES.AUTH.PHONE_REGISTERED,
        formData: { fname, lname, age, phone, email },
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { otp, createdAt } = generateOtp();
    console.log(otp);

    req.session.signupData = {
      fname,
      lname,
      age,
      phone,
      email,
      password: hashedPassword,
      otp,
      createdAt,
    };

    await sendEmail(email, otp);

    res.redirect(`/verifyOtp`);
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_REGISTER_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const resendOtp = async (req, res) => {
  try {
    const { signupData } = req.session;

    if (!signupData) {
      console.warn(MESSAGES.COMMON.SESSION_EXPIRED);
      return;
    }

    const { otp, createdAt } = generateOtp();
    signupData.otp = otp;
    signupData.createdAt = createdAt;

    await sendEmail(signupData.email, otp);
    res.render("signupOtp");
    console.log("Otp sent successfully!");
    console.log(otp);
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_RESEND_OTP_ERROR, err);
  }
};

const getVerifyOtp = (req, res) => {
  const signupData = req.session.signupData;
  if (!signupData) {
    res.render("signup", {
      signupMessage: MESSAGES.COMMON.SESSION_EXPIRED,
    });
    return;
  }
  const { email } = signupData;
  res.render("signupOtp", { otpEmailData: email });
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const signupData = req.session.signupData;

    if (!signupData) {
      res.render("signup", {
        signupMessage: MESSAGES.COMMON.SESSION_EXPIRED,
      });
      return;
    } else if (!otp) {
      return res.render("signupOtp", { errMsg: MESSAGES.AUTH.OTP_REQUIRED });
    }

    const { createdAt } = signupData;
    const currTime = Date.now();
    const timeDifference = (currTime - createdAt) / 1000;
    console.log(timeDifference);

    if (timeDifference > 120) {
      return res.render("signupOtp", { errMsg: MESSAGES.AUTH.OTP_EXPIRED });
    }

    if (signupData.otp === otp) {
      const newUser = new User({
        fname: signupData.fname,
        lname: signupData.lname,
        age: signupData.age,
        phone: signupData.phone,
        email: signupData.email,
        password: signupData.password,
      });

      await newUser.save();
      req.session.signupData = null;
      return res.redirect(`/userLogin?successMsg=${encodeURIComponent(MESSAGES.AUTH.REGISTRATION_SUCCESS)}`);
    } else {
      console.log("OTP does not Match!");
      return res.render("signupOtp", { errMsg: MESSAGES.AUTH.OTP_INVALID });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_OTP_ERROR, err);
  }
};

const userLogout = (req, res) => {
  delete req.session.user;
  res.redirect("/");
};

const toChangePass = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("userChangePassword", { user, userId });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_CHANGE_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const verifyChangePass = async (req, res) => {
  try {
    const userId = req.session.user;
    const { password, newPassword } = req.body;
    const user = await User.findOne({ _id: userId });
    const comparePass = await bcrypt.compare(password, user.password);

    if (!comparePass) {
      res.status(200).json({ message: MESSAGES.AUTH.INVALID_CURRENT_PASSWORD });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_CHANGE_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const forgotPass = async (req, res) => {
  try {
    const message = req.query.message;
    res.render("forgotPass", { message });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_FORGOT_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const verifyForgotPass = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });

    if (!user) {
      console.warn(MESSAGES.AUTH.EMAIL_NOT_REGISTERED);
      res.json({ success: false });
      return;
    }

    sendForgotEmail(email);
    console.log("Successfully sent!");
    res.json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_FORGOT_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const resetForgotPass = async (req, res) => {
  try {
    const token = req.query.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;
    const user = await User.findOne({ email });

    if (!user) {
      res.json({ success: false });
      return;
    }

    res.render("resetForgotPass", { email });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_RESET_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const verifyResetPass = async (req, res) => {
  try {
    const { pass, email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.json({ success: false });
      console.warn(MESSAGES.AUTH.EMAIL_NOT_REGISTERED);
      return;
    }

    const hashedPass = await bcrypt.hash(pass, 10);

    user.password = hashedPass;
    await user.save();

    console.log("Password successfully updated!");
    res.json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.AUTH_RESET_PASS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

module.exports = {
  userLogin,
  verifyLogin,
  signup,
  verifySignup,
  getVerifyOtp,
  verifyOtp,
  resendOtp,
  userLogout,
  forgotPass,
  verifyForgotPass,
  resetForgotPass,
  verifyResetPass,
  toChangePass,
  verifyChangePass,
};
