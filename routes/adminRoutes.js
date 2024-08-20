const express = require("express");
const adminRouter = express.Router();
const nocache = require("nocache");
const adminController = require("../controller/adminController");
const adminAuth = require("../middlewares/adminAuth");

adminRouter.use(nocache());

adminRouter.get('/dashboard', adminAuth.isAdminActive, adminController.toAdminDash);
adminRouter.get('/login', adminController.loginHome);
adminRouter.post('/login', adminController.verifyLogin);
adminRouter.get('/logout', adminController.adminLogout);

//User Management
adminRouter.get('/userManagement', adminAuth.isAdminActive,  adminController.toUserMgmt);
adminRouter.post('/userListed/:user_id', adminAuth.isAdminActiveJ, adminController.userBlockToggle);

//Categoy Management
adminRouter.get('/categoryManagement', adminAuth.isAdminActive, adminController.toCategoryMgmt);
adminRouter.get('/addCategory', adminAuth.isAdminActive, adminController.toAddCategory);
adminRouter.post('/addCategory', adminAuth.isAdminActiveJ, adminController.verifyAddCategory);
adminRouter.get('/editCategory/:category_id', adminAuth.isAdminActive, adminController.toEditCategory);
adminRouter.post('/editCategory/:category_id', adminAuth.isAdminActiveJ, adminController.verifyEditCategory);
adminRouter.post('/categoryListed/:category_id', adminAuth.isAdminActiveJ, adminController.categoryListToggle);

//Brand Management
adminRouter.get('/brandList', adminAuth.isAdminActive, adminController.toBrandList);
adminRouter.get('/addBrand', adminAuth.isAdminActive, adminController.toAddBrand);
adminRouter.post('/addBrand', adminAuth.isAdminActiveJ, adminController.verifyAddBrand);
adminRouter.get('/editBrand/:brand_id', adminAuth.isAdminActive, adminController.toEditBrand);
adminRouter.post('/editBrand/:brand_id', adminAuth.isAdminActiveJ, adminController.verifyEditBrand);
adminRouter.post('/brandListed/:brandId', adminAuth.isAdminActiveJ, adminController.brandListToggle);

//Product Management
adminRouter.get('/productManagement', adminAuth.isAdminActive, adminController.toProductMgmt);
adminRouter.get('/addproduct', adminAuth.isAdminActive, adminController.toAddProduct);
adminRouter.post('/addProduct', adminAuth.isAdminActiveJ, adminController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), adminController.verifyAddProduct);
adminRouter.get('/editProduct/:product_id', adminAuth.isAdminActive, adminController.toEditProduct);
adminRouter.post('/editProduct/:product_id', adminAuth.isAdminActiveJ, adminController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
  ]), adminController.verifyEditProduct);
adminRouter.post('/productListed/:product_id', adminAuth.isAdminActiveJ, adminController.productListToggle);

//Order Management
adminRouter.get('/orderManagement', adminAuth.isAdminActive, adminController.toOrderManagement);
adminRouter.get('/orderDetails/:order_id', adminAuth.isAdminActive, adminController.toOrderDetails);
adminRouter.post('/updateOrderStatus/:orderId/:productId', adminAuth.isAdminActiveJ, adminController.updateOrderStatus);

// Offers N Coupons - Coupons
adminRouter.get('/offersAndCoupons', adminAuth.isAdminActive, adminController.toOffersAndCoupons);
adminRouter.get('/createCoupon', adminAuth.isAdminActive, adminController.toCreateCoupon);
adminRouter.post('/createCoupon', adminAuth.isAdminActiveJ, adminController.verifyCreateCoupon);
adminRouter.put('/editCoupon/:coupon_id', adminAuth.isAdminActiveJ, adminController.verifyEditCoupon);
adminRouter.delete('/deleteCoupon/:coupon_id', adminAuth.isAdminActiveJ, adminController.deleteCoupon);

// Offers N Coupons - Offers
adminRouter.get('/createProductOffer', adminAuth.isAdminActive, adminController.toCreateOffer);
adminRouter.post('/createProductOffer', adminAuth.isAdminActiveJ, adminController.verifyProductOffer);
adminRouter.get('/createCategoryOffer', adminAuth.isAdminActive, adminController.toCreateCategoryOffer);
adminRouter.post('/createCategoryOffer', adminAuth.isAdminActiveJ, adminController.verifyCategoryOffer);
adminRouter.put('/editOffer/:offer_id', adminAuth.isAdminActiveJ, adminController.verifyEditOffer);
adminRouter.post('/offerStatusToggle/:offer_id', adminAuth.isAdminActiveJ, adminController.toggleOfferStatus);


//Sales Report
adminRouter.get('/salesReport', adminAuth.isAdminActive, adminController.toSalesReport);
adminRouter.post('/generateSalesReport', adminAuth.isAdminActiveJ, adminController.generateSalesReport);
adminRouter.get('/downloadSalesReport', adminAuth.isAdminActive, adminController.downloadSalesReport);



// adminRouter.use((req, res, next) => {
//   res.status(404).render('404');
// });

//Test Route
adminRouter.get('/ddd', (req, res) => {
  res.render('ddddddddddddd');
});


module.exports = adminRouter;