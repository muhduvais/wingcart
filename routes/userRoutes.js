const express = require("express");
const userRoutes = express.Router();
const nocache = require("nocache");
const userController = require("../controller/userController");
const userAuth = require("../middlewares/userAuth");

userRoutes.use(nocache());

//UserHome / userLogin
userRoutes.get('/', userController.userHome);
userRoutes.get('/userLogin', userController.userLogin);
userRoutes.post('/userLogin', userController.verifyLogin);

//Forgot password
userRoutes.get('/forgotPass', userController.forgotPass);
userRoutes.post('/forgotPass', userController.verifyForgotPass);

//Reset password
userRoutes.get('/resetForgotPass', userController.resetForgotPass);
userRoutes.patch('/resetForgotPass', userController.verifyResetPass);

//Signup and otp verification
userRoutes.get('/signup', userController.signup);
userRoutes.post('/signup', userController.verifySignup);
userRoutes.get('/verifyOtp', userController.getVerifyOtp);
userRoutes.post('/verifyOtp', userController.verifyOtp);
userRoutes.post('/resendOtp', userController.resendOtp);

//Logout / shop / product details
userRoutes.get('/logout', userController.userLogout);
userRoutes.get('/shop', userController.toshop);
userRoutes.get('/prodDetails/:product_id', userController.toProdDetails);

//User profile
userRoutes.get('/userProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toUserProfile);
userRoutes.get('/editProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditProfile);
userRoutes.patch('/editProfile', userAuth.isUserActiveJ, userController.editProfile);

//Change password
userRoutes.get('/changePassword', userAuth.isUserActive, userAuth.isUserBlocked, userController.toChangePass);
userRoutes.patch('/changePassword', userAuth.isUserActiveJ, userController.verifyChangePass);

//Address management
userRoutes.get('/addressManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddr);
userRoutes.get('/addAddress', userAuth.isUserActive, userAuth.isUserBlocked, userController.toAddAddr);
userRoutes.post('/addAddress', userAuth.isUserActiveJ, userController.verifyAddAddr);
userRoutes.get('/editAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditAddress);
userRoutes.put('/editAddress/:address_id', userAuth.isUserActiveJ, userController.verifyEditAddress);
userRoutes.delete('/deleteAddress/:address_id', userAuth.isUserActiveJ, userController.deleteAddress);

//Cart management
userRoutes.get('/cartManagement', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCart);
userRoutes.post('/addToCart', userController.addToCart);
userRoutes.delete('/deleteCartItem/:product_id', userAuth.isUserActiveJ, userController.deleteCartItem);//
userRoutes.patch('/updateCart', userAuth.isUserActiveJ, userController.updateCart);

userRoutes.get('/checkout', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCheckout);
userRoutes.post('/applyCoupon/:couponCode', userAuth.isUserActiveJ, userController.applyCoupon);
userRoutes.post('/createOrder', userAuth.isUserActiveJ, userController.createOrder);
userRoutes.get('/orderConfirmation/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderConf);
userRoutes.get('/orderHistory', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderHistory);
userRoutes.get('/orderDetails/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderDetails);
userRoutes.post('/downloadInvoice', userAuth.isUserActiveJ, userController.downloadInvoice);

userRoutes.post('/cancelProduct/:orderId/:productId', userAuth.isUserActiveJ, userController.cancelProduct);
userRoutes.post('/returnProduct/:orderId/:productId', userAuth.isUserActiveJ, userController.returnProduct);

userRoutes.get('/wishlist', userAuth.isUserActive, userAuth.isUserBlocked, userController.toWishlist);
userRoutes.post('/addToWishlist/:product_id', userAuth.isUserActiveJ, userController.addToWishlist);
userRoutes.delete('/removeFromWishlist/:product_id', userAuth.isUserActiveJ, userController.removeFromWishlist);

userRoutes.get('/wallet', userAuth.isUserActive, userAuth.isUserBlocked, userController.toWallet);

userRoutes.post('/retryPayment', userAuth.isUserActiveJ, userController.retryPayment);
userRoutes.patch('/updatePaymentStatus', userAuth.isUserActiveJ, userController.updatePaymentStatus);

module.exports = userRoutes;