const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport')
const profileController = require('../controllers/user/profileController')
const User = require('../models/User')
const cartController = require('../controllers/user/cartController')
const checkoutController = require('../controllers/user/checkoutController')
const orderController = require('../controllers/user/orderController')
const wishlistController = require('../controllers/user/wishlistController')
const walletController = require('../controllers/user/walletController')
const { userAuth, adminAuth } = require('../middlewares/auth')

router.get('/pageNotFound', userController.pageNotFound)
// Home Page
router.get('/', userController.loadHomepage)

// Signup
router.get('/signup', userController.loadSignup)
router.post('/signup', userController.signup)

// OTP Routes

router.post('/verify-otp', userController.verifyOTP)
router.post('/resend-otp', userController.resendOTP)

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
  if (req.user) {
    req.session.user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
    res.redirect('/')
  }
})

router.get('/login', userController.loadLogin)
router.post('/login', userController.login)
router.get('/logout', userController.logout)

// user pages

router.get('/shop', userAuth, userController.loadShop)
router.get('/productPage', userAuth, userController.loadProductPage)

// password setting
router.get('/forgot-password', profileController.getForgotPassword)
router.post('/forgot-email-valid', profileController.forgotEmailValid)
router.post('/verify-ForgotPass-Otp', profileController.verifyForgotPassOtp)
router.get('/reset-password', profileController.getResetPasspage)
router.post('/resend-forgot-otp', profileController.resendOTP)
router.post('/reset-password', profileController.postNewPassword)

// profile management

router.get('/profile', userAuth, profileController.getUserprofile)
router.get('/editProfile', userAuth, profileController.getEditProfile)
router.post('/editProfile', userAuth, profileController.editProfile)
router.get('/changePassword', userAuth, profileController.getChangePassword)
router.post('/changePassword', userAuth, profileController.changePassword)
router.get('/addAddress', userAuth, profileController.getAddAddres)
router.post('/addAddress', userAuth, profileController.addAddress)
router.get('/editAddress', userAuth, profileController.getEditAddress)
router.post('/editAddress', userAuth, profileController.editAddress)
router.delete('/deleteAddress/:id', userAuth, profileController.deleteAddress)

// cart
router.get('/cart', userAuth, cartController.getCart)
router.post('/addToCart', userAuth, cartController.addToCart)
router.post('/updateCart', userAuth, cartController.updateCart)

router.post('/removeProductFromCart', userAuth, cartController.removeProductFromCart)
// checkout
router.get('/checkout', userAuth, checkoutController.getCheckout)
router.post('/checkout', userAuth, checkoutController.getCheckout)
router.post('/checkout', userAuth, checkoutController.getCheckout)
router.post('/placeOrder', userAuth, checkoutController.placeOrder)
router.post('/applyCoupon', userAuth, checkoutController.applyCoupon)
router.post('/removeCoupon', userAuth, checkoutController.removeCoupon)
router.post('/create-razorpay-order', userAuth, checkoutController.createRazorpayOrder)
router.post('/payment-success', userAuth, checkoutController.handlePaymentSuccess)

// order
router.get('/orderSuccess', userAuth, orderController.orderSuccess)
router.get('/orderDetails/', userAuth, orderController.orderDetails)
router.post('/cancelOrder', userAuth, orderController.cancelOrder)
router.post('/returnRequest', userAuth, orderController.returnRequest)
router.get('/getOrders', userAuth, orderController.getOrders)

router.get('/downloadInvoice', userAuth, orderController.downloadInvoice)

// wishlist

router.get('/wishlist', userAuth, wishlistController.getWishlist)
router.post('/removeFromWishlist', userAuth, wishlistController.removeFromWishlist)
router.post('/toggleWishlist', userAuth, wishlistController.toggleWishlist)

// wallet
router.get('/wallet', userAuth, walletController.getWalletPage)

module.exports = router
