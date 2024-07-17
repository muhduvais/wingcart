const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Category = require("../model/categoriesModel");
const Address = require("../model/addressesModel");
const Cart = require("../model/cartModel");
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
    
    try {
        const { email, password} = req.body;
        const user = await User.findOne({email: email, isBlocked: false});

        if(!user) {
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

const toUserProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('userProfile', {user, userId, cart});
    }
    catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).send('Internal server error');
    }
}

const toEditProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('userEditProfile', {user, userId});
    }
    catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).send('Internal server error');
    }
}

const editProfile = async (req, res) => {
    try {
        const { fname, lname, age, phone, email } = req.body;
        console.log(email)
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(200).json({ message: 'User not found' });
        }
        else if (fname === user.fname && lname === user.lname && age === user.age && phone === user.phone && email === user.email) {
            res.status(200).json({ message: 'No changes to save' });
        }

        if (email) {
            if (typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ message: 'A user with this email already exists!' });
            }
        }

        const updates = {};
        if (fname && fname !== user.fname) updates.fname = fname;
        if (lname && lname !== user.lname) updates.lname = lname;
        if (age && age !== user.age) updates.age = age;
        if (phone && phone !== user.phone) updates.phone = phone;
        if (email && email !== user.email) updates.email = email;

        await User.findByIdAndUpdate(userId, {$set: updates});
        res.status(200).json({success: true});
    }
    catch (err) {
        console.error('Error editing user profile:', err);
        res.status(500).send('Internal server error');
    }
}

const toChangePass = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('userChangePassword', { user, userId });
    }
    catch (err) {
        console.error('Error fetching userChangePassword', err);
        res.status(500).send('Internal server error');
    }
}

const verifyChangePass = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { password, newPassword } = req.body;
        const user = await User.findOne({ _id: userId });
        const comparePass = await bcrypt.compare(password, user.password);

        if (!comparePass) {
            res.status(200).json({ message: 'Invalid current password!'});
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({success: true});
        
    }
    catch (err) {
        console.error('Error changing the password', err);
        res.status(500).send('Internal server error');
    }
}

const toAddr = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const addresses = await Address.find({user: userId});
        res.render('userAddresses', {user, userId, addresses});
    }
    catch (err) {
        console.error('Error fetching addresses', err);
        res.status(500).send('Internal server error'); 
    }
}

const toAddAddr = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('userAddAddress', {user, userId});
    }
    catch (err) {
        console.error('Error fetching add address', err);
        res.status(500).send('Internal server error'); 
    }
}

const verifyAddAddr = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { fname, lname, country, city, state, pincode, phone } = req.body;

        const newAddress = new Address ({
            fname,
            lname,
            country,
            city,
            state,
            pincode,
            phone,
            user: userId
        })

        await newAddress.save();

        res.status(200).json({success: true});
        
    }
    catch (err) {
        console.error('Error adding the address', err);
        res.status(500).send('Internal server error');
    }
}

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.address_id;
        await Address.findByIdAndDelete(addressId);
        res.status(200).json({success: true});
    }
    catch (err) {
        console.error('Error deleting address', err);
        res.status(500).send('Internal server error'); 
    }
}

const toEditAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addressId = req.params.address_id;
        const address = await Address.findById(addressId);
        const user = await User.findById(userId);
        res.render('userEditAddress', {user, userId, address});
    }
    catch (err) {
        console.error('Error fetching edit address', err);
        res.status(500).send('Internal server error'); 
    }
}

const verifyEditAddress = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const addressId = req.params.address_id;
        const { fname, lname, country, city, state, pincode, phone } = req.body;

        await Address.findByIdAndUpdate(addressId, {fname, lname, country, city, state, pincode, phone, user: userId});

        res.status(200).json({success: true});
        
    }
    catch (err) {
        console.error('Error editing the address', err);
        res.status(500).send('Internal server error');
    }
}

const toCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({user: userId}).populate('products.product');
        res.render('cart', {user, userId, cart});
    }
    catch (err) {
        console.error('Error fetching cart', err);
        res.status(500).send('Internal server error'); 
    }
}

const addToCart = async (req, res) => {
    try {
        console.log('Request received:', req.body);
        const userId = req.session.user._id;
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, products: [] });
        }

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

        if (productIndex > -1) {
            return res.status(200).json({ message: 'Already added to cart!' });
        } else {
            cart.products.push({ product: productId, quantity: parseInt(quantity, 10) || 1 });
            await cart.save();
            return res.status(200).json({ success: true });
        }
    } catch (err) {
        console.error('Error adding product to cart:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteCartItem = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const productId = req.params.product_id;
        const cart = await Cart.findOne({user: userId});
        
        if (cart) {
            cart.products = cart.products.filter(item => item.product.toString() !== productId);
            await cart.save();
            console.log('Product removed from cart:', cart);
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ message: 'Cart not found' });
        }
    }
    catch (err) {
        console.error('Error deleting cart item', err);
        res.status(500).send('Internal server error'); 
    }
}

const updateCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;
        
        const cart = await Cart.findOne({ user: userId });

        if (cart) {
            const productIndex = cart.products.findIndex(item => item.product.toString() === productId);
            if (productIndex > -1) {
                cart.products[productIndex].quantity = quantity;
                await cart.save();
                return res.json({ success: true });
            } else {
                return res.status(404).json({ message: 'Product not found in cart' });
            }
        } else {
            return res.status(404).json({ message: 'Cart not found' });
        }
    } catch (err) {
        console.error('Error updating cart', err);
        res.status(500).send('Internal server error');
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
    toUserProfile,
    toEditProfile,
    editProfile,
    toChangePass,
    verifyChangePass,
    toAddr,
    toAddAddr,
    verifyAddAddr,
    deleteAddress,
    toEditAddress,
    verifyEditAddress,
    toCart,
    addToCart,
    deleteCartItem,
    updateCart,
}