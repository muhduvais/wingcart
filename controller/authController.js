const User = require("../model/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../model/sendEmail");
const sendForgotEmail = require("../model/sendForgotEmail");
const generateOtp = require("../model/generateOtp");
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
      res.status(401).json({ message: "*Invalid email or password!" });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        message: "*Your access is blocked! Please contact the support team.",
      });
      return;
    }

    const comparePass = await bcrypt.compare(password, user.password);

    console.log("Compare pass: ", comparePass);

    if (!comparePass) {
      res.status(200).json({ message: "*Invalid email or password!" });
      return;
    }
    req.session.user = user._id;
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error logging in", err);
    res.status(500).send("Internal server error");
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
        signupMessage: "Email is already registered!",
        formData: { fname, lname, age, phone, email },
      });
      return;
    } else if (existingPhone) {
      res.render("signup", {
        signupMessage: "Phone number is already registered!",
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

    res.redirect("/verifyOtp");
  } catch (err) {
    console.error("Error registering user", err);
    res.status(500).send("Error registering user");
  }
};

const resendOtp = async (req, res) => {
  try {
    const { signupData } = req.session;

    if (!signupData) {
      console.log("Session expired or invalid!");
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
    console.log("Error resending the otp", err);
  }
};

const getVerifyOtp = (req, res) => {
  const signupData = req.session.signupData;
  if (!signupData) {
    res.render("signup", {
      signupMessage: "Session has expired. Please try again!",
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
        signupMessage: "Session has expired. Please try again!",
      });
    } else if (!otp) {
      return res.render("signupOtp", { errMsg: "PLease enter the OTP" });
    }

    const { createdAt } = signupData;
    const currTime = Date.now();
    const timeDifference = (currTime - createdAt) / 1000;
    console.log(timeDifference);

    if (timeDifference > 120) {
      return res.render("signupOtp", { errMsg: "OTP expired!" });
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
      res.redirect("/userLogin?registerMsg=Registered Successfully...");
      res.json({ success: true });
      res.redirect("/userLogin?successMsg=Registration successful...");
    } else {
      res.json({ success: false });
      res.render("signupOtp", { errorMsg: "Invalid OTP!" });
      console.log("OTP does not Match!");
      res.render("signupOtp", { errMsg: "Invalid OTP" });
    }
  } catch (err) {
    console.log("Error verifying OTP", err);
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
    console.error("Error fetching userChangePassword", err);
    res.status(500).send("Internal server error");
  }
};

const verifyChangePass = async (req, res) => {
  try {
    const userId = req.session.user;
    const { password, newPassword } = req.body;
    const user = await User.findOne({ _id: userId });
    const comparePass = await bcrypt.compare(password, user.password);

    if (!comparePass) {
      res.status(200).json({ message: "Invalid current password!" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error changing the password", err);
    res.status(500).send("Internal server error");
  }
};

const forgotPass = async (req, res) => {
  try {
    const message = req.query.message;
    res.render("forgotPass", { message });
  } catch (err) {
    console.error("Error fetching forgot passwword: ", err);
    res.status(500).send("Internal server error");
  }
};

const verifyForgotPass = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });

    if (!user) {
      res.json({ success: false });
      console.log("Email is not registered!");
      return;
    }

    sendForgotEmail(email);
    console.log("Successfully sent!");
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending link to the mail: ", err);
    res.status(500).send("Internal server error");
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
    console.error("Error sending link to the mail: ", err);
    res.status(500).send("Internal server error");
  }
};

const verifyResetPass = async (req, res) => {
  try {
    const { pass, email } = req.body;
    const user = await User.findOne({ email });

    console.log("new pass: ", pass);
    console.log("user: ", user);

    if (!user) {
      res.json({ success: false });
      console.log("Reset Email is not registered!");
      return;
    }

    const hashedPass = await bcrypt.hash(pass, 10);

    user.password = hashedPass;
    await user.save();

    console.log("Password successfully updated!");
    res.json({ success: true });
  } catch (err) {
    console.error("Error reseting the password: ", err);
    res.status(500).send("Internal server error");
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
