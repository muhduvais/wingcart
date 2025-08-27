const express = require("express");
const userRoutes = express.Router();
const nocache = require("nocache");
const authController = require("../controller/authController");
const userController = require("../controller/userController");
const addressController = require("../controller/addressController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
const walletController = require("../controller/walletController");
const wishlistController = require("../controller/wishlistController");
const userAuth = require("../middlewares/userAuth");
const passport = require("../model/passport");

userRoutes.use(nocache());

//UserHome / userLogin
userRoutes.get('/', userController.userHome);
userRoutes.get('/userLogin', authController.userLogin);
userRoutes.post('/userLogin', authController.verifyLogin);

userRoutes.get('/about', userController.userAbout);
userRoutes.get('/contact', userController.userContact);

//Forgot password
userRoutes.get('/forgotPass', authController.forgotPass);
userRoutes.post('/forgotPass', authController.verifyForgotPass);

//Reset password
userRoutes.get('/resetForgotPass', authController.resetForgotPass);
userRoutes.patch('/resetForgotPass', authController.verifyResetPass);

//Signup and otp verification
userRoutes.get('/signup', authController.signup);
userRoutes.post('/signup', authController.verifySignup);
userRoutes.get('/verifyOtp', authController.getVerifyOtp);
userRoutes.post('/verifyOtp', authController.verifyOtp);
userRoutes.post('/resendOtp', authController.resendOtp);

//Logout / shop / product details
userRoutes.get('/logout', authController.userLogout);
userRoutes.get('/shop', userController.toshop);
userRoutes.get('/prodDetails/:product_id', userController.toProdDetails);

//User profile
userRoutes.get('/userProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toUserProfile);
userRoutes.get('/editProfile', userAuth.isUserActive, userAuth.isUserBlocked, userController.toEditProfile);
userRoutes.patch('/editProfile', userAuth.isUserActiveJ, userController.editProfile);

//Change password
userRoutes.get('/changePassword', userAuth.isUserActive, userAuth.isUserBlocked, authController.toChangePass);
userRoutes.patch('/changePassword', userAuth.isUserActiveJ, authController.verifyChangePass);

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

userRoutes.post('/createOrder', userAuth.isUserActiveJ, orderController.createOrder);

userRoutes.patch('/paymentFailure/:id', userAuth.isUserActiveJ, orderController.updatePaymentFailure);
userRoutes.get('/orderConfirmation/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, orderController.toOrderConf);
userRoutes.get('/orderHistory', userAuth.isUserActive, userAuth.isUserBlocked, orderController.toOrderHistory);
userRoutes.get('/orderDetails/:order_id', userAuth.isUserActive, userAuth.isUserBlocked, orderController.toOrderDetails);
userRoutes.post('/downloadInvoice', userAuth.isUserActiveJ, orderController.downloadInvoice);

userRoutes.post('/cancelProduct/:orderId/:productId', userAuth.isUserActiveJ, orderController.cancelProduct);
userRoutes.post('/returnProduct/:orderId/:productId', userAuth.isUserActiveJ, orderController.returnProduct);

userRoutes.post('/retryPayment', userAuth.isUserActiveJ, orderController.retryPayment);
userRoutes.patch('/updatePaymentStatus', userAuth.isUserActiveJ, orderController.updatePaymentStatus);

//Wishlist
userRoutes.get('/wishlist', userAuth.isUserActive, userAuth.isUserBlocked, wishlistController.toWishlist);
userRoutes.post('/addToWishlist/:product_id', userAuth.isUserActiveJ, wishlistController.addToWishlist);
userRoutes.delete('/removeFromWishlist/:product_id', userAuth.isUserActiveJ, wishlistController.removeFromWishlist);

//Wallet
userRoutes.get('/wallet', userAuth.isUserActive, userAuth.isUserBlocked, walletController.toWallet);
userRoutes.get('/wallet/transactions', userAuth.isUserActive, userAuth.isUserBlocked, walletController.getWalletTransactions);
userRoutes.post('/addFund/:amount', userAuth.isUserActiveJ, walletController.addFund);
userRoutes.patch('/addFundUpdate', userAuth.isUserActiveJ, walletController.addFundUpdate);

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