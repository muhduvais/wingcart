const { response } = require("express");
const User = require("../model/config");
const bcrypt = require("bcrypt");

const toAdminDash = (req, res) => {
    if (req.session.admin) {
        const admin = req.session.admin;
        res.render("adminDash",{admin});
    }
    else {
        res.redirect("/admin/login");
    }
}

const loginHome = (req, res) => {
    if(req.session.admin) {
        res.redirect('/admin/dashboard');
    }
    else {
        res.render('adminLogin');
    }
}

const verifyLogin = async (req, res) => {
    try {
        const {email, password} = req.body;

        const admin = await User.findOne({email})

    if (!email || !password) {
        res.render("adminLogin", {errMsg: "Please fill the fields!", loginData: email})
    }
    else if (!admin || (password !== admin.password)) {
        res.render("adminLogin", {errMsg: "Invalid email or password!", loginData: email})
    }
    else {
        req.session.admin = admin;
        res.redirect("/admin/dashboard");
    }
    } catch (err) {
        console.log(err, "Error logging in!");
        res.send("Internal server error!");
    }
}

const adminLogout = (req, res) => {
    delete req.session.admin;
    res.render("adminLogin", {logoutMsg: "Logout successfully..."});
}

const toUserMgmt = async (req, res) => {
    if (req.session.admin) {

        const users = await User.find({email: {$ne: "uadmin@gmail.com"}})
        res.render("userManagement", {users});
    }
    else {
        res.redirect("/admin/login");
    }
}

const userBlockToggle = async (req, res) => {
    const {userId, isBlocked} = req.body;
    console.log(userId, isBlocked);
    if (isBlocked === true) {
        console.log(isBlocked);
        await User.updateOne({_id: userId},{$set: {isBlocked: false}});
        res.status(200).json({message: 'User blocked'})
    } else {
        console.log(isBlocked);
        await User.updateOne({_id: userId},{$set: {isBlocked: true}});
        res.status(200).json({message: 'User unblocked'})
    }
}



module.exports = {
    toAdminDash,
    loginHome,
    verifyLogin,
    adminLogout,
    toUserMgmt,
    userBlockToggle,

}