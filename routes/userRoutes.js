const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const User = require('../models/User');
router.get('/pageNotfound',userController.pageNotfound)
// Home Page
router.get('/', userController.renderHomePage);

// Signup Routes
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);

// Login Routes
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);

// OTP Routes
router.get('/verify-otp', userController.renderVerifyOTP); // Route to render OTP page
router.post('/verify-otp', userController.verifyOTP); // R
router.post('/resend-otp', userController.resendOTP);

// Profile Routes (Protected)
router.get('/profile', userController.getProfile);
router.post('/profile/update', ensureAuthenticated, async (req, res) => {
    const { username, email, address, phone } = req.body;

    try {
        const user = await User.findById(req.user._id);
        user.username = username || user.username;
        user.email = email || user.email;
        user.address = address || user.address;
        user.phone = phone || user.phone;

        await user.save();
        req.flash('success_msg', 'Profile updated successfully');
        req.user = user;
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error_msg', 'Failed to update profile');
        res.redirect('/profile');
    }
});

// Logout Route
router.get('/logout', userController.logoutUser);

// Google Authentication Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);


module.exports = router; // Export 'router' instead of 'userRoute'
