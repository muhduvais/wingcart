const express = require("express");
const userRoutes = express.Router();
const nocache = require("nocache");
const userController = require("../controller/userController");
const userAuth = require("../middlewares/userAuth");

userRoutes.use(nocache());

//Register&Login/otp-verification/userHome
userRoutes.get('/', userController.userHome);
userRoutes.get('/userLogin', userController.userLogin);
userRoutes.post('/userLogin', userController.verifyLogin);
userRoutes.get('/signup', userController.signup);
userRoutes.post('/signup', userController.verifySignup);
userRoutes.get('/verifyOtp', userController.getVerifyOtp);
userRoutes.post('/verifyOtp', userController.verifyOtp);
userRoutes.post('/resendOtp', userController.resendOtp);
userRoutes.get('/logout', userController.userLogout);
userRoutes.get('/shop', userController.toshop);
userRoutes.get('/prodDetails/:product_id', userController.toProdDetails);
userRoutes.get('/userProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toUserProfile);
userRoutes.get('/editProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditProfile);
userRoutes.patch('/editProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.editProfile);

module.exports = userRoutes;