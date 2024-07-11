const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Add a random number to the timestamp
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

const upload = multer({ storage: storage });



///////////////////////////////////////////////////////////////////////

const toAdminDash = async (req, res) => {
    const admin = req.session.admin;
    const users = await User.find();
    res.render("adminDash",{admin, users});
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
        res.send("Internal server error!");
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
        const page = parseInt(req.query.page) || 1; // Current page, default to 1 if not provided
        const skip = (page - 1) * ITEMS_PER_PAGE; // Calculate how many users to skip

        const users = await User.find({email: {$ne: "uadmin@gmail.com"}}).skip(skip).limit(ITEMS_PER_PAGE); // Fetch users for the current page

        const totalUsers = await User.countDocuments({}) - 1; // Count total users for pagination

        const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE); // Calculate total pages

        res.render('userManagement', {
            users: users,
            pagination: {
                currentPage: page,
                pages: totalPages
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Internal Server Error');
    }
}


//////////////////////////////////

const userBlockToggle = async (req, res) => {
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

const toCategoryMgmt = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page, default to 1 if not provided
        const skip = (page - 1) * ITEMS_PER_PAGE; // Calculate how many users to skip

        const categories = await Category.find({}).skip(skip).limit(ITEMS_PER_PAGE); // Fetch users for the current page

        const totalCategories = await User.countDocuments({}); // Count total users for pagination

        const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE); // Calculate total pages

        res.render('categoryManagement', {
            categories: categories,
            pagination: {
                currentPage: page,
                pages: totalPages
            }
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Internal Server Error');
    }
}

const toAddCategory = async (req, res) => {
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

const toEditCategory = async (req,res) => {
    const categoryId = req.params.category_id;
    const category = await Category.findOne({_id: categoryId});
    res.render('editCategory', {category, categoryId});
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
        const skip = (page - 1) * ITEMS_PER_PAGE;

        const products = await Product.find({}).skip(skip).limit(ITEMS_PER_PAGE);
        const categories = await Category.find({});
        const totalProducts = await Product.countDocuments({});

        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        res.render('productManagement', {
            products: products,
            categories: categories,
            pagination: {
                currentPage: page,
                pages: totalPages
            }
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

const toAddBrand = async (req, res) => {
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
    const brandId = req.params.brand_id;
    const brand = await Brand.findOne({_id: brandId});
    res.render('editBrand', {brand, brandId});
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
    const categories = await Category.find({});
    const brands = await Brand.find({});
    res.render('addProduct', {categories, brands});
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
    const outputPath = path.join(__dirname, '../assets2/img', `cropped-${file.filename}`);
    await sharp(file.path)
        .resize(width, height, {
            fit: sharp.fit.cover,
            position: sharp.strategy.entropy
        })
        .toFile(outputPath);
    return `cropped-${file.filename}`;
};

const toEditProduct = async (req,res) => {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const productId = req.params.product_id;
    const product = await Product.findOne({_id: productId});
    res.render('editProduct', {product, categories, brands, productId});
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
const brandListToggle = async (req, res) => {
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

}