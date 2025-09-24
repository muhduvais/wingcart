const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controller/adminController");
const brandController = require("../controller/brandController");
const offerController = require("../controller/offerController");
const couponController = require("../controller/couponController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const orderController = require("../controller/orderController");
const adminAuth = require("../middlewares/adminAuth");
const nocache = require("nocache");

adminRouter.use(nocache());

adminRouter.get('/dashboard', adminAuth.isAdminActive, adminController.toAdminDash);
adminRouter.get('/login', adminController.loginHome);
adminRouter.post('/login', adminController.verifyLogin);
adminRouter.get('/logout', adminController.adminLogout);

//User Management
adminRouter.get('/userManagement', adminAuth.isAdminActive,  adminController.toUserMgmt);
adminRouter.post('/userListed/:user_id', adminAuth.isAdminActiveJ, adminController.userBlockToggle);

//Categoy Management
adminRouter.get('/categoryManagement', adminAuth.isAdminActive, categoryController.toCategoryMgmt);
adminRouter.get('/addCategory', adminAuth.isAdminActive, categoryController.toAddCategory);
adminRouter.post('/addCategory', adminAuth.isAdminActiveJ, categoryController.verifyAddCategory);
adminRouter.get('/editCategory/:category_id', adminAuth.isAdminActive, categoryController.toEditCategory);
adminRouter.post('/editCategory/:category_id', adminAuth.isAdminActiveJ, categoryController.verifyEditCategory);
adminRouter.post('/categoryListed/:category_id', adminAuth.isAdminActiveJ, categoryController.categoryListToggle);

//Brand Management
adminRouter.get('/brandList', adminAuth.isAdminActive, brandController.toBrandList);
adminRouter.get('/addBrand', adminAuth.isAdminActive, brandController.toAddBrand);
adminRouter.post('/addBrand', adminAuth.isAdminActiveJ, brandController.verifyAddBrand);
adminRouter.get('/editBrand/:brand_id', adminAuth.isAdminActive, brandController.toEditBrand);
adminRouter.post('/editBrand/:brand_id', adminAuth.isAdminActiveJ, brandController.verifyEditBrand);
adminRouter.post('/brandListed/:brandId', adminAuth.isAdminActiveJ, brandController.brandListToggle);

//Product Management
adminRouter.get('/productManagement', adminAuth.isAdminActive, productController.toProductMgmt);
adminRouter.get('/addproduct', adminAuth.isAdminActive, productController.toAddProduct);
adminRouter.post('/addProduct', adminAuth.isAdminActiveJ, productController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), productController.verifyAddProduct);
adminRouter.get('/editProduct/:product_id', adminAuth.isAdminActive, productController.toEditProduct);
adminRouter.post('/editProduct/:product_id', adminAuth.isAdminActiveJ, productController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), productController.verifyEditProduct);
adminRouter.post('/productListed/:product_id', adminAuth.isAdminActiveJ, productController.productListToggle);

//Order Management
adminRouter.get('/orderManagement', adminAuth.isAdminActive, orderController.toOrderManagement);
adminRouter.get('/orderDetails/:order_id', adminAuth.isAdminActive, orderController.toAdminOrderDetails);
adminRouter.post('/updateOrderStatus/:orderId/:productId', adminAuth.isAdminActiveJ, orderController.updateOrderStatus);

// Offers N Coupons - Coupons
adminRouter.get('/offersAndCoupons', adminAuth.isAdminActive, couponController.toOffersAndCoupons);
adminRouter.get('/createCoupon', adminAuth.isAdminActive, couponController.toCreateCoupon);
adminRouter.post('/createCoupon', adminAuth.isAdminActiveJ, couponController.verifyCreateCoupon);
adminRouter.put('/editCoupon/:coupon_id', adminAuth.isAdminActiveJ, couponController.verifyEditCoupon);
adminRouter.delete('/deleteCoupon/:coupon_id', adminAuth.isAdminActiveJ, couponController.deleteCoupon);

// Offers N Coupons - Offers
adminRouter.get('/createProductOffer', adminAuth.isAdminActive, offerController.toCreateOffer);
adminRouter.post('/createProductOffer', adminAuth.isAdminActiveJ, offerController.verifyProductOffer);
adminRouter.get('/createCategoryOffer', adminAuth.isAdminActive, offerController.toCreateCategoryOffer);
adminRouter.post('/createCategoryOffer', adminAuth.isAdminActiveJ, offerController.verifyCategoryOffer);
adminRouter.put('/editOffer/:offer_id', adminAuth.isAdminActiveJ, offerController.verifyEditOffer);
adminRouter.post('/offerStatusToggle/:offer_id', adminAuth.isAdminActiveJ, offerController.toggleOfferStatus);


//Sales Report
adminRouter.get('/salesReport', adminAuth.isAdminActive, adminController.toSalesReport);
adminRouter.post('/generateSalesReport', adminAuth.isAdminActiveJ, adminController.generateSalesReport);
adminRouter.get('/downloadSalesReport', adminAuth.isAdminActive, adminController.downloadSalesReport);

module.exports = adminRouter;