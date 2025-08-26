const express = require("express");
const userRoutes = express.Router();
const nocache = require("nocache");
const userController = require("../controller/userController");
const addressController = require("../controller/addressController");
const cartController = require("../controller/cartController");
const userAuth = require("../middlewares/userAuth");
const passport = require("../model/passport");

userRoutes.use(nocache());

//UserHome / userLogin
userRoutes.get('/', userController.userHome);
userRoutes.get('/userLogin', userController.userLogin);
userRoutes.post('/userLogin', userController.verifyLogin);

userRoutes.get('/about', userController.userAbout);
userRoutes.get('/contact', userController.userContact);

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
userRoutes.get('/addressManagement', userAuth.isUserActive, userAuth.isUserBlocked, addressController.toAddr);
userRoutes.get('/addAddress', userAuth.isUserActive, userAuth.isUserBlocked, addressController.toAddAddr);
userRoutes.post('/addAddress', userAuth.isUserActiveJ, addressController.verifyAddAddr);
userRoutes.get('/editAddress/:address_id', userAuth.isUserActive, userAuth.isUserBlocked, addressController.toEditAddress);
userRoutes.put('/editAddress/:address_id', userAuth.isUserActiveJ, addressController.verifyEditAddress);
userRoutes.delete('/deleteAddress/:address_id', userAuth.isUserActiveJ, addressController.deleteAddress);

//Cart management
userRoutes.get('/cartManagement', userAuth.isUserActive, userAuth.isUserBlocked, cartController.toCart);
userRoutes.post('/addToCart', cartController.addToCart);
userRoutes.delete('/deleteCartItem/:product_id', userAuth.isUserActiveJ, cartController.deleteCartItem);//
userRoutes.patch('/updateCart', userAuth.isUserActiveJ, cartController.updateCart);

//Checkout
userRoutes.get('/checkout', userAuth.isUserActive, userAuth.isUserBlocked, userController.toCheckout);
userRoutes.post('/applyCoupon/:couponCode', userAuth.isUserActiveJ, userController.applyCoupon);
userRoutes.post('/createOrder', userAuth.isUserActiveJ, userController.createOrder);
userRoutes.patch('/paymentFailure/:id', userAuth.isUserActiveJ, userController.updatePaymentFailure);
userRoutes.get('/orderConfirmation/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderConf);
userRoutes.get('/orderHistory', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderHistory);
userRoutes.get('/orderDetails/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, userController.toOrderDetails);
userRoutes.post('/downloadInvoice', userAuth.isUserActiveJ, userController.downloadInvoice);

//Cancel and return product
userRoutes.post('/cancelProduct/:orderId/:productId', userAuth.isUserActiveJ, userController.cancelProduct);
userRoutes.post('/returnProduct/:orderId/:productId', userAuth.isUserActiveJ, userController.returnProduct);

//Wishlist
userRoutes.get('/wishlist', userAuth.isUserActive, userAuth.isUserBlocked, userController.toWishlist);
userRoutes.post('/addToWishlist/:product_id', userAuth.isUserActiveJ, userController.addToWishlist);
userRoutes.delete('/removeFromWishlist/:product_id', userAuth.isUserActiveJ, userController.removeFromWishlist);

//Wallet
userRoutes.get('/wallet', userAuth.isUserActive, userAuth.isUserBlocked, userController.toWallet);
userRoutes.get('/wallet/transactions', userAuth.isUserActive, userAuth.isUserBlocked, userController.getWalletTransactions);
userRoutes.post('/addFund/:amount', userAuth.isUserActiveJ, userController.addFund);
userRoutes.patch('/addFundUpdate', userAuth.isUserActiveJ, userController.addFundUpdate);

//Retry payment
userRoutes.post('/retryPayment', userAuth.isUserActiveJ, userController.retryPayment);
userRoutes.patch('/updatePaymentStatus', userAuth.isUserActiveJ, userController.updatePaymentStatus);

// Google auth routes
userRoutes.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
userRoutes.get('/googleAuth',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
        req.session.user = req.session.passport.user;
        
        res.redirect("/");
    }
);

module.exports = userRoutes;