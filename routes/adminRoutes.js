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

//User Management
adminRouter.get('/userManagement', adminAuth,  adminController.toUserMgmt);
adminRouter.post('/userListed/:user_id', adminController.userBlockToggle);

//Categoy Management
adminRouter.get('/categoryManagement', adminAuth, adminController.toCategoryMgmt);
adminRouter.get('/addCategory', adminAuth, adminController.toAddCategory);
adminRouter.post('/addCategory', adminController.verifyAddCategory);
adminRouter.get('/editCategory/:category_id', adminAuth, adminController.toEditCategory);
adminRouter.post('/editCategory/:category_id', adminController.verifyEditCategory);
adminRouter.post('/categoryListed/:category_id', adminController.categoryListToggle);

//Brand Management
adminRouter.get('/brandList', adminAuth, adminController.toBrandList);
adminRouter.get('/addBrand', adminAuth, adminController.toAddBrand);
adminRouter.post('/addBrand', adminController.verifyAddBrand);
adminRouter.get('/editBrand/:brand_id', adminAuth, adminController.toEditBrand);
adminRouter.post('/editBrand/:brand_id', adminController.verifyEditBrand);
adminRouter.post('/brandListed/:brandId', adminController.brandListToggle);

//Product Management
adminRouter.get('/productManagement', adminAuth, adminController.toProductMgmt);
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

//Order Management
adminRouter.get('/orderManagement', adminAuth, adminController.toOrderManagement);
adminRouter.get('/orderDetails/:order_id', adminAuth, adminController.toOrderDetails);
adminRouter.post('/updateOrderStatus/:orderId/:productId', adminController.updateOrderStatus);

// Offers N Coupons - Coupons
adminRouter.get('/offersAndCoupons', adminAuth, adminController.toOffersAndCoupons);
adminRouter.get('/createCoupon', adminAuth, adminController.toCreateCoupon);
adminRouter.post('/createCoupon', adminController.verifyCreateCoupon);
adminRouter.put('/editCoupon/:coupon_id', adminController.verifyEditCoupon);
adminRouter.delete('/deleteCoupon/:coupon_id', adminController.deleteCoupon);

// Offers N Coupons - Offers
adminRouter.get('/createProductOffer', adminAuth, adminController.toCreateOffer);
adminRouter.post('/createProductOffer', adminController.verifyProductOffer);
adminRouter.get('/createCategoryOffer', adminAuth, adminController.toCreateCategoryOffer);
adminRouter.post('/createCategoryOffer', adminController.verifyCategoryOffer);
adminRouter.put('/editOffer/:offer_id', adminController.verifyEditOffer);
adminRouter.post('/offerStatusToggle/:offer_id', adminController.toggleOfferStatus);


//Sales Report
adminRouter.get('/salesReport', adminAuth, adminController.toSalesReport);
adminRouter.post('/generateSalesReport', adminController.generateSalesReport);
adminRouter.get('/downloadSalesReport', adminAuth, adminController.downloadSalesReport);

//Test Route
adminRouter.get('/ddd', (req, res) => {
  res.render('ddddddddddddd');
});


module.exports = adminRouter;