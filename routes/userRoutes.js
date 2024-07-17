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
userRoutes.get('/changePassword', userAuth.isUserActive, userAuth.isUserBlocked, userController.toChangePass);
userRoutes.patch('/changePassword', userAuth.isUserActive, userAuth.isUserBlocked, userController.verifyChangePass);
userRoutes.get('/addressManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddr);
userRoutes.get('/addAddress', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddAddr);
userRoutes.post('/addAddress', userAuth.isUserActive, userAuth.isUserBlocked, userController.verifyAddAddr);
userRoutes.delete('/deleteAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.deleteAddress);
userRoutes.get('/editAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditAddress);
userRoutes.put('/editAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.verifyEditAddress);
userRoutes.get('/cartManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCart);
userRoutes.post('/addToCart', userController.addToCart);
userRoutes.delete('/deleteCartItem/:product_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.deleteCartItem);
userRoutes.patch('/updateCart', userAuth.isUserActive, userAuth.isUserBlocked, userController.updateCart);

module.exports = userRoutes;