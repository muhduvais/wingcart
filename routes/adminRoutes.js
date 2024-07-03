const express = require("express");
const adminRoute = express.Router();
const nocache = require("nocache");
const adminController = require("../controller/adminController");
const adminAuth = require("../middlewares/adminAuth");


adminRoute.use(nocache());

adminRoute.get('/dashboard', adminAuth, adminController.toAdminDash);
adminRoute.get('/login', adminController.loginHome);
adminRoute.post('/login', adminController.verifyLogin);
adminRoute.get('/logout', adminController.adminLogout);
adminRoute.get('/userManagement', adminAuth,  adminController.toUserMgmt);
adminRoute.post('/userListed/:user_id', adminController.userBlockToggle);
adminRoute.get('/categoryManagement', adminAuth, adminController.toCategoryMgmt);
adminRoute.get('/addCategory', adminAuth, adminController.toAddCategory);
// adminRoute.post('/addCategory', upload.single('categoryImg'), adminController.verifyAddCategory);
adminRoute.post('/addCategory', adminController.verifyAddCategory);
adminRoute.get('/editCategory/:category_id', adminAuth, adminController.toEditCategory);
// adminRoute.post('/editCategory', upload.single('categoryImg'), adminController.verifyEditCategory);
adminRoute.post('/editCategory/:category_id', adminController.verifyEditCategory);
adminRoute.post('/categoryListed/:category_id', adminController.categoryListToggle);
adminRoute.get('/productManagement', adminAuth, adminController.toProductMgmt);
adminRoute.get('/brandList', adminAuth, adminController.toBrandList);
adminRoute.get('/addBrand', adminAuth, adminController.toAddBrand);
adminRoute.post('/addBrand', adminController.verifyAddBrand);
adminRoute.get('/editBrand/:brand_id', adminAuth, adminController.toEditBrand);
adminRoute.post('/editBrand/:brand_id', adminController.verifyEditBrand);
adminRoute.get('/addproduct', adminAuth, adminController.toAddProduct);
// adminRoute.post('/addproduct', adminController.verifyAddproduct);
// adminRoute.get('/editProduct/:product_id', adminAuth, adminController.toEditProduct);
// adminRoute.post('/editProduct/:product_id', adminController.verifyEditProduct);

adminRoute.get('/ddd', (req, res) => {
    res.render('ddddddddddddd');
})


module.exports = adminRoute;