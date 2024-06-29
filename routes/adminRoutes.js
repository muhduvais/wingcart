const express = require("express");
const adminRoute = express.Router();
const nocache = require("nocache");
const adminController = require("../controller/adminController");

adminRoute.use(nocache());

adminRoute.get('/dashboard', adminController.toAdminDash);
adminRoute.get('/login', adminController.loginHome);
adminRoute.post('/login', adminController.verifyLogin);
adminRoute.get('/logout', adminController.adminLogout);
adminRoute.get('/userManagement', adminController.toUserMgmt);
adminRoute.post('/userListed/:user_id', adminController.userBlockToggle)


module.exports = adminRoute;