const { response } = require("express");
const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");

// const fs = require('fs');
// const multer = require('multer');

// Set storage engine
// const storage = multer.diskStorage({
//     destination: '../assets2/img',
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
//   });

  // Initialize upload
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1000000 },
//     fileFilter: function (req, file, cb) {
//       checkFileType(file, cb);
//     }
//   }).single('categoryImg');

  // Check file type
// function checkFileType(file, cb) {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
  
//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb('Error: Images Only!');
//     }
//   }



///////////////////////////////////////////////////////////////////////

const toAdminDash = (req, res) => {
    const admin = req.session.admin;
    res.render("adminDash",{admin});
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

const toUserMgmt = async (req, res) => {
    const users = await User.find({email: {$ne: "uadmin@gmail.com"}})
    res.render("userManagement", {users});
}

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
    const categories = await Category.find({});
    res.render("categoryManagement", {categories});
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
    const products = await Product.find({});
    res.render('productManagement', {products});
}

const toBrandList = async (req, res) => {
    const brands = await Brand.find({});
    res.render('brandList', {brands});
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

// const verifyAddProduct = async (req, res) => {
//     const {brandName, brandDesc} = req.body;
//     const brand = new Brand({
//         name: brandName,
//         description: brandDesc
//     });
//     await brand.save();
//     res.redirect('/admin/brandList?message=Brand added successfully...');
// }

// const toEditProduct = async (req,res) => {
//     const brandId = req.params.brand_id;
//     const brand = await Brand.findOne({_id: brandId});
//     res.render('editBrand', {brand});
// }

// const verifyEditProduct = async (req, res) => {
//     const {brandName, brandDesc} = req.body;
//     await Brand.updateOne({_id: req.params.brand_id}, {name: brandName, description: brandDesc});
//     res.redirect('/admin/brandList?message=Brand edited successfully...');
// }


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

}