const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Admin = require("../model/adminModel");
const sharp = require('sharp');

const multer = require('multer');
const path = require('path');

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

    if (!email || !password) {
        res.render("adminLogin", {errMsg: "Please fill the fields!", loginData: email})
    }
    else if (!admin || (password !== admin.password)) {
        res.render("adminLogin", {errMsg: "Invalid email or password!", loginData: email})
    }
    else {
        req.session.admin = admin;
        res.redirect("/admin/dashboard");
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
    const category = new Category ({
        name: req.body.categoryName,
        description: req.body.categoryDesc,
    });
    await category.save();
    res.redirect('/admin/categoryManagement?message=Category added successfully...');
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
    res.render('editCategory', {category});
}

const verifyEditCategory = async (req, res) => {
    const {categoryName, categoryDesc} = req.body;
    await Category.updateOne({_id: req.params.category_id}, {name: categoryName, description: categoryDesc});
    res.redirect('/admin/categoryManagement?message=Category edited successfully...');
}

// const verifyEditCategory = async (req, res) => {
//     try {
//         const { categoryName, categoryDesc } = req.body;
//         const updates = {
//           name: categoryName,
//           description: categoryDesc
//         };
    
//         if (req.file) {
//           const buffer = await sharp(req.file.buffer)
//             .resize({ width: 300, height: 300 }) // Resize image as needed
//             .toBuffer();
//           updates.image = buffer;
//         }
    
//         await Category.findByIdAndUpdate(req.params.category_id, updates);
//         res.redirect('/admin/categoryManagement');
//       } catch (err) {
//         console.error(err);
//         res.status(500).send('Error editing category.');
//       }
// }

const toProductMgmt = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page, default to 1 if not provided
        const skip = (page - 1) * ITEMS_PER_PAGE; // Calculate how many users to skip

        const products = await Product.find({}).skip(skip).limit(ITEMS_PER_PAGE); // Fetch users for the current page
        const categories = await Category.find({});
        const totalProducts = await Product.countDocuments({}); // Count total users for pagination

        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE); // Calculate total pages

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
        const page = parseInt(req.query.page) || 1; // Current page, default to 1 if not provided
        const skip = (page - 1) * ITEMS_PER_PAGE; // Calculate how many users to skip

        const brands = await Brand.find({}).skip(skip).limit(ITEMS_PER_PAGE); // Fetch users for the current page

        const totalBrands = await Brand.countDocuments({}); // Count total users for pagination

        const totalPages = Math.ceil(totalBrands / ITEMS_PER_PAGE); // Calculate total pages

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
    const {brandName, brandDesc} = req.body;
    const brand = new Brand({
        name: brandName,
        description: brandDesc
    });
    await brand.save();
    res.redirect('/admin/brandList?message=Brand added successfully...');
}

const toEditBrand = async (req,res) => {
    const brandId = req.params.brand_id;
    const brand = await Brand.findOne({_id: brandId});
    res.render('editBrand', {brand});
}

const verifyEditBrand = async (req, res) => {
    const {brandName, brandDesc} = req.body;
    await Brand.updateOne({_id: req.params.brand_id}, {name: brandName, description: brandDesc});
    res.redirect('/admin/brandList?message=Brand edited successfully...');
}

const toAddProduct = async (req, res) => {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    res.render('addProduct', {categories, brands});
}

const verifyAddProduct = async (req, res) => {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const { productName, model, description, price, type, strapType, color, category, brand, stock } = req.body;
  
  const images = [];
  if (req.files.image1) images.push(req.files.image1[0].filename);
  if (req.files.image2) images.push(req.files.image2[0].filename);
  if (req.files.image3) images.push(req.files.image3[0].filename);

  const newProduct = new Product({
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

  newProduct.save()
    .then(() => res.redirect('/admin/productManagement'))
    .catch((err) => {
        console.log("Error saving the product", err);
        res.render('addProduct', {categories, brands, productName, model, description, price, type, strapType, color, category, brand, stock });
    });
}

const toEditProduct = async (req,res) => {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const productId = req.params.product_id;
    const product = await Product.findOne({_id: productId});
    res.render('editProduct', {product, categories, brands});
}

const verifyEditProduct = async (req, res) => {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const { productName, model, description, price, type, strapType, color, category, brand, stock , existingImage1, existingImage2, existingImage3} = req.body;
    
    try {
  const images = [];
    images.push(req.files['image1'] ? req.files['image1'][0].filename : existingImage1);
    images.push(req.files['image2'] ? req.files['image2'][0].filename : existingImage2);
    images.push(req.files['image3'] ? req.files['image3'][0].filename : existingImage3);

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

    res.redirect('/admin/productManagement');

    }catch(err) {
        res.render('editProduct', {categories, brands, productName, model, description, price, type, strapType, color, category, brand, stock})
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