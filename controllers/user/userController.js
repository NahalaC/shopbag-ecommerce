const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Category=require('../../models/Categorymodel')
const Product=require('../../models/Productmodel')
const transporter = require('../../config/nodemailerConfig');
const OTPModel = require('../../models/OTP');
const { validateEmail, generateOTP, sendOTPEmail } = require('../../utils/otpHelper');
//const authenticateUser = require('../../utils/authUtils');
const passport = require('passport');
const nodemailer = require("nodemailer")
const flash=require('express-flash')
const optGenerator=require('otp-generator')



const pageNotfound=async (req, res) => {
    try {
        res.render('user/page-404');  // Assuming page-404.ejs exists in views/user
    } catch (error) {
        console.error("Error rendering the 404 page:", error);
        res.status(500).send("Internal Server Error");  // Handle the error better
    }
};
// Render the homepage
const renderHomePage = (req, res) => {
    res.render('user/index', {
        userData: req.session.userData || null // Passing userData to the view
    });
};


// Render login page
const loadLogin = (req, res) => {
   let message= req.flash('error')
   console.log(message[0]);

    res.render('user/login', { message});
};
const signup=async(req,res)=>{
    
    
    const {name,email,phone,password}=req.body;

try { const newUser=new User({name,email,phone,password});
await newUser.save();
 return res.redirect("/signup")
    
} catch (error) {
    console.error('Error for save user',error);
    res.status(500).send('Internal server error')
    
}
}


 
// Handle user login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        
        // If user not found
        if (!user) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/login");
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If passwords don't match
        if (!passwordMatch) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/login");
        }

        // If user is blocked
        if (user.status) {
            req.flash("error", "User is blocked!");
            return res.redirect("/login");
        }

        // Store user data in session
        req.session.userData = {
            id: user._id,
            username: user.username,
            email: user.email
        };
        // Redirect to home page if login is successful
        res.redirect("/");
    } catch (error) {
        console.error("Login error:", error);
        req.flash("error", "Failed to log in");
        res.redirect("/login");
    }
};


// Render signup page
const loadSignup = async(req, res) => {
    try {
        return res.render('user/signup')
        
    } catch (error) {
        console.log('Home page not laoding:error')
        res.status(500).send('server error')
        
    }
    
};


// Controller function to render the OTP verification page
const renderVerifyOTP = (req, res) => {
    const email = req.query.email; // Get the email from the query parameters
    res.render('user/verify-otp', { email, error_msg: req.flash('error_msg') }); // Pass the email to the view
};



// Handle OTP verification
const verifyOTP = async (req, res) => {
    const { otp } = req.body;
    const sessionOtp = req.session.otp;
    const email = req.session.email;
    const username = req.session.username;
    const password = req.session.password; // Retrieve password from session

    if (otp === sessionOtp) {
        try {
            // Hash the password before saving the user
            const hashedPassword = await bcrypt.hash(password, 10); // Ensure password is available

            // Create and save new user
            const newUser = new User({
                username: username,
                email: email,
                password: hashedPassword, // Store hashed password
            });

            await newUser.save();

            req.flash('success_msg', 'User registered successfully.');
            res.redirect('/');
        } catch (error) {
            console.error('Error verifying OTP:', error);
            req.flash('error_msg', 'Error registering the user.');
            res.redirect('/verify-otp');
        }
    } else {
        req.flash('error_msg', 'Invalid OTP.');
        res.redirect('/verify-otp');
    }
};


const resendOTP = async (req, res) => {
    const { email } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email address.' });
    }

    try {
        // Check if the email exists and if the OTP can be resent
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the last OTP was sent more than 5 minutes ago
        if (req.session.otpExpiresAt && Date.now() < req.session.otpExpiresAt) {
            return res.status(400).json({ message: 'Please wait before requesting a new OTP.' });
        }

        // Generate and send new OTP
        const otp = generateOTP(); // Generate a 6-digit OTP
        const otpExpiresAt = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

        req.session.otp = otp; // Store new OTP in session
        req.session.otpExpiresAt = otpExpiresAt; // Store new OTP expiry time

        await sendOTPEmail(email, otp);
        console.log(`Resent OTP for ${email}: ${otp}`); // Print new OTP to terminal for testing/debugging

        res.json({ message: 'OTP has been resent.' });
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ message: 'Error resending OTP.' });
    }
};


// Render profile page
const getProfile = (req, res) => {
    if (!req.session.userData) {
        // Redirect to login if not authenticated
        return res.redirect('/login');
    }

    // Render the profile page and pass user data
    res.render('user/profile', { userData: req.session.userData });
};
// Handle user logout
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            req.flash('error_msg', 'Error logging out. Please try again.');
            return res.redirect('/');
        }

        res.clearCookie('connect.sid');  // Clear the session cookie
        req.flash('success_msg', 'You have been logged out.');
        return res.redirect('/');  // Redirect to home page
    });
};

module.exports = {
    renderHomePage,
    loadLogin,
    signup,
    loadSignup,
    renderVerifyOTP,
    verifyOTP,
    resendOTP,
    getProfile,
    logoutUser,
    login,
    pageNotfound
};
