const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Cart = require("../model/cartModel");
const Order = require("../model/ordersModel");
const Admin = require("../model/adminModel");
const sharp = require('sharp');

const multer = require('multer');
const path = require('path');
const { error } = require("console");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../assets2/img'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

const upload = multer({ storage: storage });



///////////////////////////////////////////////////////////////////////

const toAdminDash = async (req, res) => {
    try {
        const admin = req.session.admin;
        const users = await User.find();
        res.render("adminDash",{admin, users});
    }
    catch (err) {
        console.log("Error fetching admin dashboard", err);
        res.status(500).send("Internal server error");
    }
}

const loginHome = (req, res) => {
    if (req.session.admin) {
        res.redirect('/admin/dashboard');
    }
    else {
        res.render('adminLogin');
    }
}

const verifyLogin = async (req, res) => {
    try {
        const {email, password} = req.body;
        const admin = await User.findOne({email})

    if (!admin || (password !== admin.password)) {
        res.status(200).json({ message: "*Invalid email or password!"});
    }
    else {
        req.session.admin = admin;
        res.status(200).json({success: true});
    }
    } catch (err) {
        console.log(err, "Error logging in!");
        res.status(500).send("Internal server error!");
    }
}

const adminLogout = (req, res) => {
    delete req.session.admin;
    res.render("adminLogin", {logoutMsg: "Logout successfully..."});
}

//////////////////////////////////
const ITEMS_PER_PAGE = 5;

const toUserMgmt = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const skip = (page - 1) * ITEMS_PER_PAGE;
        
        const query = {
            email: { $ne: "uadmin@gmail.com" },
            $or: [
                { fname: { $regex: search, $options: 'i' } },
                { lname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };

        const users = await User.find(query).skip(skip).limit(ITEMS_PER_PAGE);

        const totalUsers = await User.countDocuments(query);

        const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

        res.render('userManagement', {
            users: users,
            pagination: {
                currentPage: page,
                pages: totalPages
            },
            search: search
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Internal Server Error');
    }
};


//////////////////////////////////

const userBlockToggle = async (req, res) => {
    try {
        const {userId, isBlocked} = req.body;
        console.log(userId, isBlocked);
        if (isBlocked === true) {
            await User.updateOne({_id: userId},{$set: {isBlocked: false}});
            res.status(200).json({message: 'User unblocked'})
        } else {
            await User.updateOne({_id: userId},{$set: {isBlocked: true}});
            res.status(200).json({message: 'User blocked'})
        }
    }
    catch (err) {
        console.error('Error on block toggle:', err);
        res.status(500).send('Internal Server Error');
    }
}

const toCategoryMgmt = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const skip = (page - 1) * ITEMS_PER_PAGE;

        const query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

        const categories = await Category.find(query).skip(skip).limit(ITEMS_PER_PAGE);

        const totalCategories = await User.countDocuments(query);

        const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE);

        res.render('categoryManagement', {
            categories: categories,
            pagination: {
                currentPage: page,
                pages: totalPages
            },
            search: search
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Internal Server Error');
    }
}

const toAddCategory = (req, res) => {
    res.render("addCategory");
}

const verifyAddCategory = async (req, res) => {
    try {
        const {name, description} = req.body;
        const regName = new RegExp(name, 'i');
        const isPresentCategory = await Category.findOne({name: {$regex: regName}});
        if (!isPresentCategory) {
            const category = new Category ({
                name: name,
                description: description
            });
            await category.save();
            console.log("Category saved");
            res.status(200).json({success: true});
        }
        else {
            res.status(200).json({message: "Category already exists!"});
        }
    }
    catch (err) {
        console.error("Error adding category", err);
        res.status(500).send('Internal Server Error');
    }
}

const categoryListToggle = async (req, res) => {
    try {
        const {categoryId, isListed} = req.body;
        console.log(categoryId, isListed);
        if (isListed === true) {
            await Category.updateOne({_id: categoryId},{$set: {isListed: false}});
            res.status(200).json({message: 'Category Unlisted'})
        } else {
            await Category.updateOne({_id: categoryId},{$set: {isListed: true}});
            res.status(200).json({message: 'Category Listed'})
        }
    }
    catch (err) {
        console.error("Error on toggle list:", err);
        res.status(500).send('Internal Server Error');
    }
}

const toEditCategory = async (req,res) => {
    try {
        const categoryId = req.params.category_id;
        const category = await Category.findOne({_id: categoryId});
        res.render('editCategory', {category, categoryId});
    }
    catch (err) {
        console.error("Error fetching edit category:", err);
        res.status(500).send('Internal Server Error');
    }
}

const verifyEditCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const regName = new RegExp(name, 'i');
        
        const existingCategory = await Category.findOne({ name: { $regex: regName }, _id: { $ne: req.params.category_id }});

        if (existingCategory) {
            return res.status(200).json({ message: "Category name already exists!" });
        }

        await Category.updateOne({ _id: req.params.category_id }, { $set: { name, description } });

        console.log("Category updated");
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error("Error editing category!", err);
        res.status(500).send('Internal Server Error');
    }
}




const toProductMgmt = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const skip = (page - 1) * ITEMS_PER_PAGE;

        const query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ]
        };

        const products = await Product.find(query).skip(skip).limit(ITEMS_PER_PAGE);
        const totalProducts = await Product.countDocuments(query);

        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        res.render('productManagement', {
            products: products,
            pagination: {
                currentPage: page,
                pages: totalPages
            },
            search: search
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).send('Internal Server Error');
    }
}

const toBrandList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * ITEMS_PER_PAGE;

        const brands = await Brand.find({}).skip(skip).limit(ITEMS_PER_PAGE);

        const totalBrands = await Brand.countDocuments({});

        const totalPages = Math.ceil(totalBrands / ITEMS_PER_PAGE);

        res.render('brandList', {
            brands: brands,
            pagination: {
                currentPage: page,
                pages: totalPages
            }
        });
    } catch (err) {
        console.error('Error fetching brands:', err);
        res.status(500).send('Internal Server Error');
    }
}

const toAddBrand = (req, res) => {
    res.render('addBrand');
}

const verifyAddBrand = async (req, res) => {
    try {
        const {brandName, brandDesc} = req.body;
        const regName = new RegExp(brandName, 'i');
        console.log(regName);
        const isPresentBrand = await Brand.findOne({name: {$regex: regName}});

        if (!isPresentBrand) {
            const brand = new Brand({
                name: brandName,
                description: brandDesc
            });
            
            await brand.save();
            console.log("Brand saved");
            res.status(200).json({success: true});
        }
        else {
            res.status(200).json({message: "Brand already exists!"});
        }
    }
    catch (err) {
        console.error("Error adding brand", err);
        res.status(500).send("Internal server error");
    }
}

const toEditBrand = async (req,res) => {
    try {
        const brandId = req.params.brand_id;
        const brand = await Brand.findOne({_id: brandId});
        res.render('editBrand', {brand, brandId});
    }
    catch (err) {
        console.error("Error fetching edit brand:", err);
        res.status(500).send('Internal Server Error');
    }
}

const verifyEditBrand = async (req, res) => {
    try {
        const {name, description} = req.body;
        const regName = new RegExp(name, 'i');
        console.log(req.params.brand_id);
        const existingBrand = await Brand.findOne({ name: { $regex: regName }, _id: { $ne: req.params.brand_id }});

        if (existingBrand) {
            return res.status(200).json({ message: "Brand already exists!" });
        }

        await Brand.updateOne({ _id: req.params.brand_id }, { $set: { name, description } });

        console.log("Brand updated");
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error("Error editing brand!", err);
        res.status(500).send('Internal Server Error');
    }
}

const toAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({});
        const brands = await Brand.find({});
        res.render('addProduct', {categories, brands});
    }
    catch (err) {
        console.error("Error fetching add product:", err);
        res.status(500).send('Internal Server Error');
    }
}

const verifyAddProduct = async (req, res) => {
    try {
        const { productName, model, description, price, type, strapType, color, category, brand, stock } = req.body;
        const regName = new RegExp(productName, 'i');
        const isProductPresent = await Product.findOne({name: {$regex: regName}});
  
        const images = [];

                const width = 300;
                const height = 300;

                
                if (req.files.image1) {
                    const processedImage1 = await processImage(req.files.image1[0], width, height);
                    images.push(processedImage1);
                }
                if (req.files.image2) {
                    const processedImage2 = await processImage(req.files.image2[0], width, height);
                    images.push(processedImage2);
                }
                if (req.files.image3) {
                    const processedImage3 = await processImage(req.files.image3[0], width, height);
                    images.push(processedImage3);
                }

            if (!isProductPresent) {
                const newProduct = new Product({
                    name: productName,
                    model,
                    description,
                    price,
                    type,
                    strapType,
                    color,
                    category,
                    brand,
                    stock,
                    images,
                    addedDate: new Date(),
                    isDeleted: false
                });
        
                await newProduct.save()
                console.log("Product saved");
                res.status(200).json({success: true});
                }
            else {
                res.status(200).json({message: "Product name already exists!"});
            }
    }
    catch (err) {
        console.error("Error adding the product", err);
        res.status(500).send('Internal Server Error');
    }
}

const processImage = async (file, width, height) => {
    try {
        const outputPath = path.join(__dirname, '../assets2/img', `cropped-${file.filename}`);
        await sharp(file.path)
        .resize(width, height, {
            fit: sharp.fit.cover,
            position: sharp.strategy.entropy
        })
        .toFile(outputPath);
        return `cropped-${file.filename}`;
    }
    catch (err) {
        console.error("Error processing image:", err);
        res.status(500).send('Internal Server Error');
    }
};

const toEditProduct = async (req,res) => {
    try {
        const categories = await Category.find({});
        const brands = await Brand.find({});
        const productId = req.params.product_id;
        const product = await Product.findOne({_id: productId});
        res.render('editProduct', {product, categories, brands, productId});
    }
    catch (err) {
        console.error("Error fetching edit product:", err);
        res.status(500).send('Internal Server Error');
    }
}

const verifyEditProduct = async (req, res) => {
    
    try {
        const { productName, model, description, price, type, strapType, color, category, brand, stock , existingImage1, existingImage2, existingImage3} = req.body;
        const regName = new RegExp(productName, 'i');
        const isProductPresent = await Product.findOne({ name: { $regex: regName }, _id: { $ne: req.params.product_id }});

        const images = [];

            const width = 300;
            const height = 300;

            if (req.files.image1) {
                const processedImage1 = await processImage(req.files.image1[0], width, height);
                images.push(processedImage1);
                console.log("Pushing new image");
            }
            else {
                console.log("Pushing existing image");
                images.push(existingImage1); }

            if (req.files.image2) {
                const processedImage2 = await processImage(req.files.image2[0], width, height);
                images.push(processedImage2);
            }
            else { images.push(existingImage2); }

            if (req.files.image3) {
                const processedImage3 = await processImage(req.files.image3[0], width, height);
                images.push(processedImage3);
            }
            else { images.push(existingImage3); }

        if (!isProductPresent) {
            await Product.updateOne({_id: req.params.product_id}, {
                name: productName,
                model: model,
                description: description,
                price: price,
                type: type,
                strapType: strapType,
                color: color,
                category: category,
                brand: brand,
                stock: stock,
                images: images,
                addedDate: new Date(),
                isDeleted: false
            });

            console.log("Product updated");
            res.status(200).json({success: true});

            //////
        const carts = await Cart.find({ 'products.product': req.params.product_id });

        for (let cart of carts) {
            cart.products.forEach(item => {
                if (item.product.toString() === req.params.product_id && item.quantity > stock) {
                    item.quantity = stock;
                }
                else if (item.product.toString() === req.params.product_id && item.quantity === 0 && stock > 0) {
                    item.quantity = 1;
                }
            });
            await cart.save();
        }
        //////
        }
        else {
            res.status(200).json({message: "Product name already exists!"});
        }

    }catch(err) {
        console.error("Error editing the product", err);
        res.status(500).send('Internal Server Error');
    }
}

const productListToggle = async (req, res) => {
    try {
        const {productId, isListed} = req.body;
        console.log(productId, isListed);
        if (isListed === true) {
            await Product.updateOne({_id: productId},{$set: {isListed: false}});
            res.status(200).json({message: 'Product Unlisted'})
        } else {
            await Product.updateOne({_id: productId},{$set: {isListed: true}});
            res.status(200).json({message: 'Product Listed'})
        }
    }
    catch (err) {
        console.error("Error on product list toggle:", err);
        res.status(500).send('Internal Server Error');
    }
}
const brandListToggle = async (req, res) => {
    try {
        const {brandId, isListed} = req.body;
        console.log(brandId, isListed);
        if (isListed === true) {
            await Brand.updateOne({_id: brandId},{$set: {isListed: false}});
            res.status(200).json({message: 'Brand Unlisted'})
        } else {
            await Brand.updateOne({_id: brandId},{$set: {isListed: true}});
            res.status(200).json({message: 'Brand Listed'})
        }
    }
    catch (err) {
        console.error("Error on brand list toggle:", err);
        res.status(500).send('Internal Server Error');
    }
}

const toOrderManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const skip = (page - 1) * ITEMS_PER_PAGE;

        const query = {
            $or: [
                { orderId: { $regex: search } },
            ]
        };

        const orders = await Order.find(query).sort({ orderDate: -1 }).skip(skip).limit(ITEMS_PER_PAGE);

        const totalOrders = await User.countDocuments(query) - 1;

        const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

        res.render('adminOrderManagement', { 
            orders,
            pagination: {
                currentPage: page,
                pages: totalPages
            },
            search: search
         });
    }
    catch (err) {
        console.error('Error fetching order Management', err);
        res.status(500).send('Internal server error'); 
    }
}

const toOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.order_id;

        const order = await Order.findById(orderId)
        .populate('products.product')
        .populate('address')
        .populate('payment')

        const subtotal = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const shipping = subtotal < 500 ? 40 : 0;
        const totalAmount = subtotal + gst + shipping;

        res.render('adminOrderDetails', { 
            order,
            subtotal,
            gst,
            shipping,
            totalAmount
         });
    } catch (err) {
        console.error('Error fetching order details', err);
        res.status(500).send('Internal server error');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { status } = req.body;

        const order = await Order.findById(orderId);

        const product = order.products.find(item => item.product.toString() === productId);

        const statusOrder = ['pending', 'dispatched', 'delivered'];
        if (statusOrder.indexOf(status) > statusOrder.indexOf(product.status)) {
            product.status = status;
            await order.save();
            return res.json({ success: true });
        }
        res.json({ success: false });
    } catch (err) {
        console.error('Error updating order status', err);
        res.status(500).json({ success: false });
    }
};




module.exports = {
    toAdminDash,
    loginHome,
    verifyLogin,
    adminLogout,
    toUserMgmt,
    userBlockToggle,
    toCategoryMgmt,
    toAddCategory,
    verifyAddCategory,
    toEditCategory,
    verifyEditCategory,
    categoryListToggle,
    toProductMgmt,
    toBrandList,
    toAddBrand,
    verifyAddBrand,
    toEditBrand,
    verifyEditBrand,
    toAddProduct,
    verifyAddProduct,
    upload,
    toEditProduct,
    verifyEditProduct,
    productListToggle,
    brandListToggle,
    toOrderManagement,
    toOrderDetails,
    updateOrderStatus,

}