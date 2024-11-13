const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const { userAuth, adminAuth } = require('../middlewares/auth');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController')
const productController = require("../controllers/admin/productController");
const uploads = require("../middlewares/fileuploadmulter");
const orderController = require("../controllers/admin/orderController");
const offerController = require('../controllers/admin/offerController')
const couponController = require('../controllers/admin/couponController');
const salesReportController = require('../controllers/admin/salesReportController');



router.get("/pageError", adminController.pageError)
//login management
router.get('/login', adminController.loadAdmin);
router.post('/login', adminController.login);

//dashboard
router.get("/dashboard", adminAuth, adminController.loadDashboard)


router.get("/logout", adminController.logout);

//Customer management
router.get("/users", adminAuth, customerController.customerInfo)
router.get("/blockCustomer", adminAuth, customerController.customerBlocked)
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked)


//category management


router.get("/categories", adminAuth, categoryController.categoryInfo);
router.post("/addCategories", adminAuth, categoryController.addCategory);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory)

//product management


router.get("/addProduct", adminAuth, productController.getProductAddPage);
router.post("/addProduct", adminAuth, uploads.array("images", 4), productController.addProducts);
router.get("/products", adminAuth, productController.getAllproducts);
router.get("/listProduct", adminAuth, productController.listProduct);
router.get("/unlistProduct", adminAuth, productController.unlistProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct", adminAuth, uploads.array("images", 4), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);


//order  management

router.get("/orders", adminAuth, orderController.orderInfo)
router.post("/updateOrderStatus", adminAuth, orderController.updateOrderStatus);
router.get('/orderDetails', adminAuth, orderController.orderDetails);

//offers
//productOffers

router.get("/productOffers", adminAuth, offerController.getProductOffers);
router.get('/loadAddProductOfferPage', adminAuth, offerController.loadAddProductOfferPage)
router.post('/addProductOffer', adminAuth, offerController.addProductOffer)
router.post('/toggleProductOffer/:id', adminAuth, offerController.toggleProductOffer);
router.delete('/deleteProductOffer/:id', adminAuth, offerController.deleteProductOffer);

//categoryOffer
router.get('/categoryOffers', adminAuth, offerController.getCategoryOffers);
router.get('/loadAddCategoryOfferPage', adminAuth, offerController.loadAddCategoryOfferPage)
router.post('/addCategoryOffer', adminAuth, offerController.addCategoryOffer);
router.post('/toggleCategoryOffer/:id', adminAuth, offerController.toggleCategoryOffer);
router.delete('/deleteCategoryOffer/:id', adminAuth, offerController.deleteCategoryOffer);


//coupen
router.get('/coupons', adminAuth, couponController.getCouponListingPage);
router.get('/addCoupon', adminAuth, couponController.loadAddCouponPage);

router.post('/addCoupon', adminAuth, couponController.addCoupon);
router.patch('/toggleCoupon/:couponId', couponController.toggleCouponStatus);

//sales report

router.get('/salesReport', adminAuth, salesReportController.getSalesReportPage);
router.get('/salesReport/excel', adminAuth, salesReportController.downloadSalesReportExcel);
router.get('/salesReport/pdf', adminAuth, salesReportController.downloadSalesReportPDF);

module.exports = router;

