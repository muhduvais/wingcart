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
userRoutes.get('/forgotPass', userController.forgotPass);
userRoutes.post('/forgotPass', userController.verifyForgotPass);
userRoutes.get('/resetForgotPass', userController.resetForgotPass);
userRoutes.patch('/resetForgotPass', userController.verifyResetPass);
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
userRoutes.patch('/editProfile', userController.editProfile);
userRoutes.get('/changePassword', userAuth.isUserActive, userAuth.isUserBlocked, userController.toChangePass);
userRoutes.patch('/changePassword', userController.verifyChangePass);
userRoutes.get('/addressManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddr);
userRoutes.get('/addAddress', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddAddr);
userRoutes.post('/addAddress', userController.verifyAddAddr);
userRoutes.get('/editAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditAddress);
userRoutes.put('/editAddress/:address_id', userController.verifyEditAddress);
userRoutes.delete('/deleteAddress/:address_id', userController.deleteAddress);
userRoutes.get('/cartManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCart);
userRoutes.post('/addToCart', userController.addToCart);
userRoutes.delete('/deleteCartItem/:product_id', userController.deleteCartItem);
userRoutes.patch('/updateCart', userController.updateCart);
userRoutes.get('/checkout', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCheckout);
userRoutes.post('/createOrder', userController.createOrder);
userRoutes.get('/orderConfirmation/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderConf);
userRoutes.get('/orderHistory', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderHistory);
userRoutes.get('/orderDetails/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderDetails);
// userRoutes.post('/updateOrderStatus/:orderId/:productId', userController.updateOrderStatus);
userRoutes.post('/cancelProduct/:orderId/:productId', userController.cancelProduct);

module.exports = userRoutes;