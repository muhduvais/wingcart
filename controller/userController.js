const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Category = require("../model/categoriesModel");
const Address = require("../model/addressesModel");
const Cart = require("../model/cartModel");
const Payment = require("../model/paymentModel");
const Order = require("../model/ordersModel");
const bcrypt = require("bcrypt");
const sendEmail = require("../model/sendEmail");
const sendForgotEmail = require("../model/sendForgotEmail");
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
        const newArrivals = await Product.find().sort({ addedDate: -1 }).limit(10);
        const mostPurchased = await Order.aggregate([
            { $unwind: '$products' },
            { $group: { _id: '$products.product', count: { $sum: '$products.quantity' } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const mostPurchasedProducts = await Product.find({ 
            _id: { $in: mostPurchased.map(item => item._id) }
        });

        const categories = await Category.find({});
        const menCategory = await Category.findOne({ name: 'Men' });
        const womenCategory = await Category.findOne({ name: 'Women' });
        const mostPurchasedMen = await Product.find({ 
            _id: { $in: mostPurchased.map(item => item._id) },
            category: menCategory._id
        });
        const mostPurchasedWomen = await Product.find({ 
            _id: { $in: mostPurchased.map(item => item._id) },
            category: womenCategory._id
        });

        if (!user) {
            res.render('home' , {
                products: filteredProducts,
                newArrivals,
                mostPurchasedProducts,
                mostPurchasedMen,
                mostPurchasedWomen,
                categories
            });
        }
        else {

            const cart = await Cart.findOne({user: user._id}).populate('products.product');
            let subtotal = 0;

            if (cart) {
                subtotal = cart.products.reduce((sum, item) => {
                return sum + (item.product.price * item.quantity);
                }, 0);
            }
            
            res.render('home', {
                user,
                products: filteredProducts,
                cart,
                subtotal,
                newArrivals,
                mostPurchasedProducts,
                mostPurchasedMen,
                mostPurchasedWomen,
                categories
            });
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

const isNewProduct = (addedDate) => {
    const currentDate = new Date();
    const twoDaysAgo = new Date(currentDate);
    twoDaysAgo.setDate(currentDate.getDate() - 2);
    return addedDate >= twoDaysAgo;
};

const toshop = async (req, res) => {
    try {
        const sortBy = req.query.sortby || 'featured';
        const searchVal = req.query.searchVal || '';
        const user = req.session.user;

        const listedCategories = await Category.find({ isListed: true }).select('_id');
        const listedBrands = await Brand.find({ isListed: true }).select('_id');
        const filterCategories = req.query.filterCategories ? [].concat(req.query.filterCategories) : [];
        const filterBrands = req.query.filterBrands ? [].concat(req.query.filterBrands) : [];
        const filter = { isListed: true };

        // Add listedCategories to filterCategories
        const categoryFilter = filterCategories.length > 0
        ? { $in: filterCategories.filter(cat => listedCategories.map(lc => lc._id.toString()).includes(cat)) }
        : { $in: listedCategories.map(cat => cat._id) };

        // Add listedBrands to filterBrands
        const brandFilter = filterBrands.length > 0
            ? { $in: filterBrands.filter(brand => listedBrands.map(lb => lb._id.toString()).includes(brand)) }
            : { $in: listedBrands.map(brand => brand._id) };

        // Update filter object
        if (categoryFilter.$in.length > 0) {
            filter.category = categoryFilter;
        }

        if (brandFilter.$in.length > 0) {
            filter.brand = brandFilter;
        }

        if (searchVal) {
            filter.description = { $regex: searchVal, $options: 'i' };
        }
        
        console.log(filter);

        const brands = await Brand.find({ isListed: true });
        const categories = await Category.find({});

        //Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 9;

        const totalProductsCount = await Product.countDocuments({
            ...filter,
        });

        const totalPages = Math.ceil(totalProductsCount / limit);

        const skip = (page - 1) * limit;

        //Sorted by new arrivals
        const newSorted = await Product.find({
            ...filter,
        })
        .sort({ addedDate: -1 })
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        //Sorted by featured
        const popular = await Order.aggregate([
            { $unwind: '$products' },
            { $group: { _id: '$products.product', count: { $sum: '$products.quantity' } } },
            { $sort: { count: -1 } }
        ]);

        const popularProductIds = popular.map(item => item._id);

        // const skipPopular = skip < popularProductIds.length ? skip : popularProductIds.length;
        // const popularLimit = Math.min(limit, popularProductIds.length);

        const popularProducts = await Product.find({ 
            ...filter,
            _id: { $in: popularProductIds },
            // isListed: true,
        })
        .populate('category')
        .populate('brand')
        .limit(limit);

        // const remainingSkip = Math.max(0, skip - popularProductIds.length);
        // const remainingLimit = limit - popularProducts.length;

        const otherProducts = await Product.find({ 
            ...filter,
            _id: { $nin: popularProductIds },
            // isListed: true,
        })
        .populate('category')
        .populate('brand')
        .limit(limit);

        const combinedProducts = [...popularProducts, ...otherProducts].slice(0, limit);

        const collation = { locale: 'en', strength: 2 };

        //Sorted price H2L
        const priceHighToLow = await Product.find({
            ...filter,
        })
        .sort({ price: -1 })
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        //Sorted price L2H
        const priceLowToHigh = await Product.find({
            ...filter,
        })
        .sort({ price: 1 })
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        //Sorted in ascending order
        const descendingSorted = await Product.find({
            ...filter,
        })
        .collation(collation)
        .sort({ name: -1 })
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        //Sorted in descending order
        const ascendingSorted = await Product.find({
            ...filter,
        })
        .collation(collation)
        .sort({ name: 1 })
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        //Featured products
        const featuredProducts = await Product.find({
            ...filter,
        })
        .collation(collation)
        .populate('category')
        .populate('brand')
        .skip(skip)
        .limit(limit);

        let products;
        if (sortBy === 'newArrivals') {
            products = newSorted;
        }else if (sortBy === 'popularity') {
            products = combinedProducts;
        }else if (sortBy === 'highToLow') {
            products = priceHighToLow;
        }else if (sortBy === 'lowToHigh') {
            products = priceLowToHigh;
        } else if (sortBy === 'ascending') {
            products = ascendingSorted;
        } else if (sortBy === 'descending') {
            products = descendingSorted;
        } else {
            products = featuredProducts;
        }

        if (!user) {
            res.render('shop' , {
                products,
                categories,
                sortBy,
                currentPage: page,
                totalPages,
                totalProductsCount,
                brands,
                isNewProduct,
                filterCategories,
                filterBrands,
                searchVal
            });
        }
        else {
            const cart = await Cart.findOne({user: user._id}).populate('products.product');
            let subtotal = 0;

            if (cart) {
                subtotal = cart.products.reduce((sum, item) => {
                return sum + (item.product.price * item.quantity);
                }, 0);
            }
            res.render('shop', {
                user,
                products,
                cart,
                subtotal,
                categories,
                sortBy,
                currentPage: page,
                totalPages,
                totalProductsCount,
                brands,
                isNewProduct,
                filterCategories,
                filterBrands,
                searchVal
            });
        }
    } catch (err) {
        console.error(err, "Error rendering shop");
    }
}

const toProdDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const product = await Product.findOne({_id: req.params.product_id}).populate('category');
        const category = product.category;
        const recomProducts = await Product.find({category, _id: { $ne: req.params.product_id }});

        let subtotal = 0;

        if (!user) {
            res.render('prodDetails', { 
                user : false,
                product, 
                recomProducts,
                subtotal,
                isNewProduct,
            });
            return;
        }

        const cart = await Cart.findOne({user: user._id}).populate('products.product');

        if (cart) {
            subtotal = cart.products.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
            }, 0);
        }

        console.log(cart);

        res.render('prodDetails', { 
            user,
            cart,
            product, 
            recomProducts,
            subtotal,
            isNewProduct,
        })
    } catch (err) {
        console.error(err, "Error rendering product details");
    }
}

const toUserProfile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        res.render('userProfile', {user, userId});
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
        const cart = await Cart.findOne({ user: userId }).populate('products.product');

        if (cart) {
            const subtotal = cart.products.reduce((sum, item) => {
                return sum + (item.product.price * item.quantity);
            }, 0);

            const gst = subtotal * 0.18;
            const shipping = subtotal < 500 ? 40 : 0;
            const total = subtotal + gst + shipping;

            res.render('cart', {
                user,
                userId,
                cart,
                subtotal,
                gst,
                shipping,
                total
            });
        } else {
            res.render('cart', { user, userId, cart, subtotal: 0, gst: 0, shipping: 0, total: 0 });
        }
    } catch (err) {
        console.error('Error fetching cart', err);
        res.status(500).send('Internal server error');
    }
}

const addToCart = async (req, res) => {
    try {
        console.log('Request received:', req.body);
        const user = req.session.user;
        const { productId, quantity } = req.body;

        if (!user || user.isBlocked) {
            return res.status(200).json({ user: false });
        }

        const userId = user._id;

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, products: [] });
        }

        const productIndex = cart.products.findIndex(p => p.product.toString() === productId);

        if (productIndex > -1) {
            return res.status(200).json({ message: 'Already added to cart!', user: true });
        } else {
            cart.products.push({ product: productId, quantity: parseInt(quantity, 10) || 1 });
            await cart.save();
            return res.status(200).json({ success: true, user: true });
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

const toCheckout = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const cart = await Cart.findOne({user: userId}).populate('products.product');
        const address = await Address.find({user: userId});
        let paymentMethod = await Payment.find({user: userId});

        if (paymentMethod.length === 0) {
            const newMethod = new Payment({
                user: user._id,
                type: 'Cash on delivery',
                details: null
            });

            await newMethod.save();
        }

        paymentMethod = await Payment.find({user: userId});

        if (cart) {
            const subtotal = cart.products.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
            }, 0);

            const gst = subtotal * 0.18;
            const shipping = subtotal < 500 ? 40 : 0;
            const total = subtotal + gst + shipping;

            res.render('checkout', {user, userId, cart, total, gst, shipping, address, paymentMethod});
        } else {
            res.render('checkout', { user, userId, cart, subtotal: 0, address, paymentMethod });
        }
    }
    catch (err) {
        console.error('Error fetching checkout', err);
        res.status(500).send('Internal server error'); 
    }
}

const generateOrderId = () => {
    const date = new Date();
    const components = [
        date.getFullYear(),
        ('0' + (date.getMonth() + 1)).slice(-2),
        ('0' + date.getDate()).slice(-2),
        ('0' + date.getHours()).slice(-2),
        ('0' + date.getMinutes()).slice(-2),
        ('0' + date.getSeconds()).slice(-2),
    ];

    const dateString = components.join('');
    const randomNumber = Math.floor(Math.random() * 10000);

    return `ORD-${dateString}-${randomNumber}`;
};

const updateProductQuantities = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate('products.product');

        if (!order) {
            throw new Error('Order not found');
        }

        for (const item of order.products) {
            const productId = item.product._id;
            const orderedQuantity = item.quantity;

            const product = await Product.findById(productId);

            if (product) {
                console.log(product.name);
                console.log(product.stock);
                product.stock -= orderedQuantity;
                console.log(product.stock);
                if (product.stock < 0) {
                    product.stock = 0;
                }

                await product.save();
            }
        }

        console.log('Product quantities updated successfully');
    } catch (err) {
        console.error('Error updating product quantities:', err);
    }
}

const createOrder = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { addressId, paymentMethodId } = req.body;

        const user = await User.findById(userId);
        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        const orderId = generateOrderId();

        if (!cart) {
            return res.status(200).json({ message: 'Cart is empty' });
        }

        const orderProducts = cart.products.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price,
            status: 'pending',
            cancellationDate: null,
            cancellationReason: null,
            returnDate: null,
            returnReason: null,
        }));

        const subtotal = orderProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const shipping = subtotal < 500 ? 40 : 0;
        const totalAmount = subtotal + gst + shipping;

        const newOrder = new Order({
            orderId: orderId,
            user: user._id,
            address: addressId,
            orderDate: new Date(),
            coupon: null,
            products: orderProducts,
            payment: paymentMethodId,
            offers: [],
            totalAmount,
            gst,
            shipping
        });

        await newOrder.save();

        await Cart.deleteOne({ user: userId });

        const createdOrder = await Order.findOne({orderId});
        const order_id = createdOrder._id;
        updateProductQuantities(order_id);

        res.status(200).json({ success: 'Order placed successfully', orderId });
    } catch (err) {
        console.error('Error creating order', err);
        res.status(500).send('Internal server error');
    }
};

const toOrderConf = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.params.order_id;
        const order = await Order.findOne({ orderId })
            .populate('products.product')
            .populate('address');

        const orderDate = new Date(order.orderDate);
        const expectedDeliveryDate = new Date(orderDate);
        expectedDeliveryDate.setDate(orderDate.getDate() + 3);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const deliveryDay = days[expectedDeliveryDate.getDay()];

        const subtotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const shippingCharge = subtotal < 500 ? 40 : 0;
        const totalAmount = subtotal + gst + shippingCharge;

        res.render('orderConfirmation', { user, order, deliveryDay, subtotal, gst, shippingCharge, totalAmount });
    } catch (err) {
        console.error('Error fetching order confirmation', err);
        res.status(500).send('Internal server error'); 
    }
};

const toOrderHistory = async (req, res) => {
    try {
        const user = req.session.user;
        const orders = await Order.find({ user: user._id }).sort({ orderDate: -1 });

        res.render('orderHistory', { user, orders });
    }
    catch (err) {
        console.error('Error fetching order History', err);
        res.status(500).send('Internal server error'); 
    }
}

const toOrderDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.params.order_id;
        const order = await Order.findById(orderId).populate('products.product').populate('address');

        if (!order || order.user.toString() !== user._id.toString()) {
            return res.status(404).send('Order not found');
        }

        const subtotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const shipping = subtotal < 500 ? 40 : 0;
        const totalAmount = subtotal + gst + shipping;

        res.render('orderDetails', { user, order, subtotal, gst, shipping, totalAmount });
    } catch (err) {
        console.error('Error fetching order details', err);
        res.status(500).send('Internal server error');
    }
};

const cancelProduct = async (req, res) => {

        const { orderId, productId } = req.params;
        const reason = req.body.reason;

    try {
        const order = await Order.findById(orderId);
        console.log(order.address);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const product = order.products.find(item => item.product.toString() === productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        product.status = 'cancelled';
        product.cancellationDate = Date.now();
        product.cancellationReason = reason;

        const updateProduct = await Product.findOne({ _id: productId });

        updateProduct.stock += product.quantity;

        await updateProduct.save();
        await order.save();
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const forgotPass = async (req, res) => {
    try {
        const message = req.query.message;
        res.render('forgotPass', { message });
    } catch (err) {
        console.error('Error fetching forgot passwword: ', err);
        res.status(500).send('Internal server error');
    }
}

const verifyForgotPass = async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email: email })

        if (!user) {
            res.json({ success: false });
            console.log('Email is not registered!');
            return;
        }

        sendForgotEmail(email);
        console.log('Successfully sent!');
        res.json({ success: true });

    } catch (err) {
        console.error('Error sending link to the mail: ', err);
        res.status(500).send('Internal server error');
    }
}

const resetForgotPass = async (req, res) => {
    try {
        const email = req.query.email;
        const user = await User.findOne({ email: email })

        if (!user) {
            res.json({ success: false });
            return;
        }

        res.render('resetForgotPass', { email });



    } catch (err) {
        console.error('Error sending link to the mail: ', err);
        res.status(500).send('Internal server error');
    }
}

const verifyResetPass = async (req, res) => {
    try {
        const { pass, email} = req.body;
        const user = await User.findOne({ email: email })

        if (!user) {
            res.json({ success: false });
            console.log('Reset Email is not registered!');
            return;
        }

        const hashedPass = await bcrypt.hash(pass, 10);

        user.password = hashedPass;
        await user.save();

        console.log('Password successfully updated!');
        res.json({ success: true });

    } catch (err) {
        console.error('Error reseting the password: ', err);
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
    toCheckout,
    createOrder,
    toOrderConf,
    toOrderHistory,
    toOrderDetails,
    cancelProduct,
    forgotPass,
    verifyForgotPass,
    resetForgotPass,
    verifyResetPass,
}