const User = require("../model/usersModel");
const bcrypt = require("bcrypt");
const sendEmail = require("../model/sendEmail");
const generateOtp = require("../model/generateOtp");
const passport = require("../model/passport");

const userLoginHome = (req, res) => {
    if(req.session.user) {
        res.redirect("/userHome");
    }
    else {
        res.render("loginHome");
    }
}

const userLogin = (req, res) => {
    if (req.session.user) {
        res.redirect("/userHome");
    }
    else {
        successMsg = req.query.successMsg;
        res.render("login", {successMsg});
    }
}

const verifyLogin = async (req, res) => {
    
    const {email, password} = req.body;
    
    try {
        const user = await User.findOne({email});

        if(!email || !password) {
            res.render("login", {errMessage: "Please fill the fields"});
            return;
        }
        else if(!user) {
            res.render("login", {errMessage: "Invalid username or password!", loginData: email});
            return;
        }

        const comparePass = await bcrypt.compare(password, user.password);

        if(!comparePass) {
            res.render("login", {errMessage: "Invalid username or password!", loginData: email});
        }
        else {
            req.session.user = user;
            res.redirect("/userHome");
            return;
        }
    }
    catch(err) {
        console.error("Error logging in", err);
        res.status(500).send("Internal server error");
    }
}

const signup = (req, res) => {
    let formData = req.session.signupData || {};
    console.log(formData);
    res.render("signup", {formData});
}

const verifySignup = async (req, res) => {

    try {
        const {fname, lname, age, phone, email, password} = req.body;

        const existingEmail = await User.findOne({email});
        const existingPhone = await User.findOne({phone});

        if(existingEmail) {
            res.render("signup", {signupMessage: "Email is already registered!", formData: {fname, lname, age, phone, email}});
            return;
        }
        else if(existingPhone) {
            res.render("signup", {signupMessage: "Phone number is already registered!", formData: {fname, lname, age, phone, email}});
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { otp, createdAt} = generateOtp();
        console.log(otp);

        req.session.signupData = { fname, lname, age, phone, email, password: hashedPassword, otp, createdAt };
        await sendEmail(email, otp);

        res.redirect("/verifyOtp");
        
    }
    catch(err) {
        console.error("Error registering user", err);
        res.status(500).send("Error registering user");
    }
}

const resendOtp = async (req, res) => {
    try {
        const {signupData} = req.session;

        if(!signupData) {
            console.log("Session expired or invalid!");
            return;
        }

        const { otp, createdAt } = generateOtp();
        signupData.otp = otp;
        signupData.createdAt = createdAt;

        await sendEmail(signupData.email, otp);
        res.render("signupOtp");
        console.log("Otp sent successfully!");
        console.log(otp)

    } catch (err) {
        console.log("Error resending the otp",err);
    }
}

const getVerifyOtp = (req, res) => {
    const signupData = req.session.signupData;
    if(!signupData) {
        res.render("signup", {signupMessage: "Session has expired. Please try again!"});
        return;
    }
    const {email} = signupData;
    res.render("signupOtp", {otpEmailData: email});
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const signupData = req.session.signupData;

        if (!signupData) {
            res.render("signup", {signupMessage: "Session has expired. Please try again!"});
        }
        else if (!otp) {
            return res.render("signupOtp", {errMsg: "PLease enter the OTP"});
        }

        const {createdAt} = signupData;
        const currTime = Date.now();
        const timeDifference = (currTime - createdAt) / 1000;
        console.log(timeDifference);

        if(timeDifference > 30){
            return res.render("signupOtp", {errMsg: "OTP expired!"});
        }

        if(signupData.otp === otp) {
            const newUser = new User ({
                fname: signupData.fname,
                lname: signupData.lname,
                age: signupData.age,
                phone: signupData.phone,
                email: signupData.email,
                password: signupData.password,
            });

            await newUser.save();
            req.session.signupData = null;
            // res.redirect("/userLogin?registerMsg=Registered Successfully...");
            // res.json({success: true});
            console.log("OTP Matched!");
            res.redirect("/userLogin?successMsg=Registration successful...");
        }
        else {
            // res.json({success: false});
            // res.render("signupOtp", {errorMsg: "Invalid OTP!"})
            console.log("OTP does not Match!");
            res.render("signupOtp", {errMsg: "Invalid OTP"});
        }

    } catch(err) {
        // res.json({success: false})
        console.log("Error verifying OTP", err);
    }
}

const userHome = (req, res) => {
    if(req.session.user) {
        res.render("home", { user: req.session.user });
    }
    else {
        res.redirect("/");
    }
}

//google auth

// const googleAuth = (req, res) => {
//     if(req.session.passport.user) {
//         req.session.user = req.session.passport.user;
//         res.redirect("/userHome");
//     }
//     else {
//         console.log("No google data!");
//     }
// }

// const googleMid = (req, res) => {
//     passport.authenticate('google', { scope: ['profile', 'email'] });
// }

// const googleCallBack = (req, res, next) => {
//     passport.authenticate('google', { failureRedirect: '/login' });
//     next();
// }

// const googleCallBackTwo = async (req, res) => {
//     console.log(req.session.passport.user);
//     res.redirect("/googleSessionAuth");
// }

const userLogout = (req, res) => {
    delete req.session.user;
    res.redirect("/");
}

module.exports = {
    userLoginHome,
    userLogin,
    verifyLogin,
    signup,
    verifySignup,
    getVerifyOtp,
    verifyOtp,
    resendOtp,
    userHome,
    userLogout,
    // googleAuth,
    // googleMid,
    // googleCallBack,
    // googleCallBackTwo,
}