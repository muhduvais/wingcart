const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Category = require("../model/categoriesModel");
const bcrypt = require("bcrypt");
const sendEmail = require("../model/sendEmail");
const generateOtp = require("../model/generateOtp");

const userHome = async (req, res) => {
    try {
        const user = req.session.user;
        const products = await Product.find({ isListed: true })
            .populate({
                path: 'category',
                match: { isListed: true }
            })
            .populate({
                path: 'brand',
                match: { isListed: true }
            });

        const filteredProducts = products.filter(product => product.category && product.brand);
        if (!user) {
            console.log("No user found!");
            res.render('home' , {products: filteredProducts})
        }
        else {
            res.render('home', {user, products: filteredProducts});
        }
    } catch (err) {
        console.error(err, "Error rendering home");
    }
}

const userLogin = (req, res) => {
    if (req.session.user) {
        res.redirect("/");
    }
    else {
        successMsg = req.query.successMsg;
        res.render("login", {successMsg});
    }
}

const verifyLogin = async (req, res) => {
    
    const { email, password} = req.body;
    
    try {
        const user = await User.findOne({email: email, isBlocked: false});

        if(!user) {
            console.log("user not found");
            res.status(200).json({ message: "*Invalid email or password!"});
        }
        else {
            const comparePass = await bcrypt.compare(password, user.password);
            
            if(!comparePass) {
                res.status(200).json({ message: "*Invalid email or password!"});
                return;
            }
            req.session.user = user;
            res.status(200).json({success: true});
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

const userLogout = (req, res) => {
    delete req.session.user;
    res.redirect("/");
}

const toshop = async (req, res) => {
    try {
        const user = req.session.user;
        const products = await Product.find({ isListed: true })
            .populate({
                path: 'category',
                match: { isListed: true }
            })
            .populate({
                path: 'brand',
                match: { isListed: true }
            });

        const filteredProducts = products.filter(product => product.category && product.brand);
        if (!user) {
            console.log("No user found!");
            res.render('shop' , {products: filteredProducts})
        }
        else {
            res.render('shop', {user, products: filteredProducts});
        }
    } catch (err) {
        console.error(err, "Error rendering shop");
    }
}

const toProdDetails = async (req, res) => {
    try {
        const user = await User.find();
        const product = await Product.findOne({_id: req.params.product_id});
        res.render('prodDetails', {user, product})
    } catch (err) {
        console.error(err, "Error rendering product details");
    }
}



module.exports = {
    userHome,
    userLogin,
    verifyLogin,
    signup,
    verifySignup,
    getVerifyOtp,
    verifyOtp,
    resendOtp,
    userLogout,
    toshop,
    toProdDetails,
}