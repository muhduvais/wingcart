const express = require("express");
const adminRouter = express.Router();
const nocache = require("nocache");
const adminController = require("../controller/adminController");
const adminAuth = require("../middlewares/adminAuth");


adminRouter.use(nocache());

adminRouter.get('/dashboard', adminAuth, adminController.toAdminDash);
adminRouter.get('/login', adminController.loginHome);
adminRouter.post('/login', adminController.verifyLogin);
adminRouter.get('/logout', adminController.adminLogout);
adminRouter.get('/userManagement', adminAuth,  adminController.toUserMgmt);
adminRouter.post('/userListed/:user_id', adminController.userBlockToggle);
adminRouter.get('/categoryManagement', adminAuth, adminController.toCategoryMgmt);
adminRouter.get('/addCategory', adminAuth, adminController.toAddCategory);
// adminRouter.post('/addCategory', upload.single('categoryImg'), adminController.verifyAddCategory);
adminRouter.post('/addCategory', adminController.verifyAddCategory);
adminRouter.get('/editCategory/:category_id', adminAuth, adminController.toEditCategory);
// adminRouter.post('/editCategory', upload.single('categoryImg'), adminController.verifyEditCategory);
adminRouter.post('/editCategory/:category_id', adminController.verifyEditCategory);
adminRouter.post('/categoryListed/:category_id', adminController.categoryListToggle);
adminRouter.get('/productManagement', adminAuth, adminController.toProductMgmt);
adminRouter.get('/brandList', adminAuth, adminController.toBrandList);
adminRouter.get('/addBrand', adminAuth, adminController.toAddBrand);
adminRouter.post('/addBrand', adminController.verifyAddBrand);
adminRouter.get('/editBrand/:brand_id', adminAuth, adminController.toEditBrand);
adminRouter.post('/editBrand/:brand_id', adminController.verifyEditBrand);
adminRouter.post('/brandListed/:brandId', adminController.brandListToggle);
adminRouter.get('/addproduct', adminAuth, adminController.toAddProduct);
adminRouter.post('/addProduct', adminController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), adminController.verifyAddProduct);
adminRouter.get('/editProduct/:product_id', adminAuth, adminController.toEditProduct);
adminRouter.post('/editProduct/:product_id', adminController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), adminController.verifyEditProduct);
adminRouter.post('/productListed/:product_id', adminController.productListToggle);

adminRouter.get('/ddd', (req, res) => {
    res.render('ddddddddddddd');
})


module.exports = adminRouter;