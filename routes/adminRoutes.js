const express = require('express');
const adminRoute = express.Router();
const adminController = require('../controllers/admin/adminController');
const { adminauthentication } = require('../middlewares/adminAuthenticated');

adminRoute.use(express.urlencoded({ extended: true }));

// Admin Login Page
adminRoute.get('/adminLogin', adminController.renderAdminLogin);

// Admin Login Handling
adminRoute.post('/adminLogin', adminController.adminLogin);

// Admin Dashboard (protected route)
adminRoute.get('/dashboard', adminauthentication, (req, res) => {
    res.render('admin/dashboard');
});

module.exports = adminRoute;
