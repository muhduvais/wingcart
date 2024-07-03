const express = require("express");
const userRoutes = express.Router();
const nocache = require("nocache");
const userController = require("../controller/userController");
const passport = require("../model/passport");

userRoutes.use(nocache());

//Register&Login/otp-verification/userHome
userRoutes.get('/', userController.userLoginHome);
userRoutes.get('/userLogin', userController.userLogin);
userRoutes.post('/userLogin', userController.verifyLogin);
userRoutes.get('/signup', userController.signup);
userRoutes.post('/signup', userController.verifySignup);
userRoutes.get('/verifyOtp', userController.getVerifyOtp);
userRoutes.post('/verifyOtp', userController.verifyOtp);
userRoutes.post('/resendOtp', userController.resendOtp);
userRoutes.get('/userHome', userController.userHome);
userRoutes.get('/logout', userController.userLogout);



//Google-authentication-callback
// userRoutes.get('/googleSessionAuth', userController.googleAuth);

// userRoutes.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// userRoutes.get('/googleAuth',
//     passport.authenticate('google', { failureRedirect: '/login' }),
//     (req, res) => {
//         res.redirect('/userHome');
//     });


// Google auth routes
// userRoute.get('/auth/google', userController.googleMid);
// userRoute.get('/googleAuth', userController.googleCallBack, userController.googleCallBackTwo);


module.exports = userRoutes;