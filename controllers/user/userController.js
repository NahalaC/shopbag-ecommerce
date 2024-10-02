const bcrypt = require("bcrypt");
const User = require("../../models/User");
const Category = require("../../models/Categorymodel");
const Product = require("../../models/Productmodel");
const OTPModel = require("../../models/OTP");
const passport = require("passport");
const nodemailer = require("nodemailer");
const { response } = require("express");
const env = require("dotenv").config();
const mongoose = require("mongoose");

const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");

const pageNotFound = async (req, res) => {
    try {
        res.render("user/page-404");
    } catch (error) {
        console.error("Error rendering the 404 page:", error);
        res.status(500).send("Internal Server Error");
    }
};
// homepage
const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const products = await Product.find({ isBlocked: false }).populate({
            path: "category",
            match: { isBlocked: false },
        });

        const category = await Category.find({}).sort({ name: 1 });
        const newArrivals = await Product.find({ isBlocked: false })
            .populate({ path: "category", match: { isBlocked: false } })
            .sort({ createdAt: -1 });
        const filteredProductNewArrivals = newArrivals.filter(
            (product) => product.category
        );
        if (user) {
            const userData = await User.findOne({
                _id: new mongoose.Types.ObjectId(user.id),
            });

            console.log("userdata", userData);
            res.render("user/index", {
                user: userData,
                products: products,
                categories: category,
                newArrivals: newArrivals,
            });
        } else {
            return res.render("user/index", {
                products: products,
                categories: category,
                newArrivals: filteredProductNewArrivals,
            });
        }
    } catch (error) {
        console.log("Home pafe not loading", error);
        res.status(500).send("Server Error");
    }
};

//  signup page
const loadSignup = async (req, res) => {
    try {
        return res.render("user/signup");
    } catch (error) {
        console.log("Home page not laoding:error");
        res.status(500).send("server error");
    }
};

function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("generated otp:", otp);
    return otp;
}
async function senderVerificationemail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verifiy your account",
            text: `Your opt is ${otp}`,
            html: `<b>your OTP:${otp}</b>`,
        });
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {
    console.log("signup reached");

    try {
        const { name, email, phone, password, cpassword } = req.body;

        if (password !== cpassword) {
            return res.render("user/signup", { message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("user/signup", {
                message: "User with this mail already exists",
            });
        }

        const otp = generateOTP();
        const emailsent = await senderVerificationemail(email, otp);

        req.session.userOtp = otp;
        req.session.userData = { name, email, phone, password };
        let user = {};

        console.log("OTP sent", otp);
        console.log("Session Data", req.session.userData);

        res.render("user/verify-otp", { email });
    } catch (error) {
        console.error("Error during signup:", error);
        res.redirect("/pageNotFound");
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }
};

const verifyOTP = async (req, res) => {
    try {
        console.log(req.body.otp, "body");
        const otp = req.body.otp;
        console.log("OTP received:", otp);

        const sessionOtp = req.session.userOtp;
        const userData = req.session.userData;

        if (!sessionOtp || !userData) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Session expired. Please try again.",
                });
        }

        if (otp === sessionOtp) {
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log("User already exists");
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: "User with this email already exists. Please log in.",
                    });
            }

            const passwordHash = await securePassword(userData.password);

            const saveUserdata = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
            });

            await saveUserdata.save();
            console.log("usersaved", saveUserdata);

            req.session.user = {
                id: saveUserdata._id,
                name: saveUserdata.name,
                email: saveUserdata.email,
            };

            req.session.userOtp = null;
            req.session.userData = null;

            console.log("User stored in session:", req.session.user);

            res.status(200).json({ success: true, redirectUrl: "/" });
        } else {
            return res
                .status(200)
                .json({ success: false, message: "Invalid OTP, please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res
            .status(500)
            .json({ success: false, message: "An error occurred." });
    }
};

const resendOTP = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res
                .status(400)
                .json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOTP();
        req.session.userOtp = otp;

        console.log("Generated OTP:", otp);

        const emailSent = await senderVerificationemail(email, otp);

        if (emailSent) {
            return res
                .status(200)
                .json({ success: true, message: "OTP Resent Successfully" });
        } else {
            return res
                .status(500)
                .json({
                    success: false,
                    message: "Failed to resend OTP. Please try again",
                });
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        return res
            .status(500)
            .json({
                success: false,
                message: "Internal Server Error. Please try again",
            });
    }
};
const loadLogin = async (req, res) => {
    console.log("Login page loaded");
    console.log("Session data:", req.session);
    try {
        if (!req.session.user) {
            return res.render("user/login");
        } else {
            console.log("User is already logged in, redirecting to home");
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};
const login = async (req, res) => {
    console.log("login reached");
    try {
        if (req.session.user) {
            return res.redirect("/");
        }

        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.render("user/login", { message: "User not found" });
        }

        if (findUser.isBlocked) {
            return res.render("user/login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("user/login", { message: "Incorrect password" });
        }
        // req.session.user =findUser._id;
        //  {
        //     id: findUser._id,
        //     name: findUser.name,
        //     email: findUser.email
        // };

        req.session.user = {
            id: findUser._id,
            name: findUser.name,
            email: findUser.email,
        };

        req.session.save((err) => {
            if (err) {
                console.log("Error saving session:", err);
            } else {
                console.log("Session successfully saved");
            }
        });

        console.log("User stored in session:", req.session.user);

        res.redirect("/");
    } catch (error) {
        console.error("Login error", error);
        res.render("user/login", { message: "login failed. Please try again" });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error destroying session:", err);
            return res.redirect("/page-404");
        }
        console.log("session cleared, redirecting to login");
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
};

const loadProductPage = async (req, res) => {
    try {
        const productId = req.query.id;

        if (!productId) {
            return res.status(400).send("Product ID not provided");
        }

        const product = await Product.findById(productId).populate({
            path: "category",
            match: { isListed: true },
        });

        if (!product || !product.category) {
            return res.status(404).send("Product or category not found");
        }

        const relatedProducts = await Product.find({
            category: product.category,
        }).limit(4);

        return res.render("user/productPage", { product, relatedProducts });
    } catch (error) {
        console.error(error.message, "Error in load product page");
        res.status(500).send("Internal server error");
    }
};

// const loadShop = async (req, res) => {
//     console.log("Reached shop");

//     try {
//         const user = req.session.user;

//         const {
//             sort = "",
//             order = "",
//             category: selectedCategory = "",
//         } = req.query;

//         // Initialize sorting options
//         let sortOptions = {};
//         if (sort) {
//             sortOptions[sort] = order === "asc" ? 1 : -1; // Generalized sorting
//         }

//         // Build the query object
//         let query = { isBlocked: false };
//         if (selectedCategory) {
//             query.category = selectedCategory; // Filter by category if selected
//         }

//         // Fetch products based on the query and sorting options
//         const products = await Product.find(query)
//             .populate({
//                 path: "category",
//                 match: { isListed: true },
//             })
//             .sort(sortOptions);

//         // Filter out products that have a blocked category
//         const filteredProducts = products.filter((product) => product.category);

//         // Fetch listed categories for the dropdown
//         const categories = await Category.find({ isListed: true }).sort({ name: 1 });

//         // Fetch new arrivals
//         const newArrivals = await Product.find({ isBlocked: false })
//             .populate({
//                 path: "category",
//                 match: { isListed: true },
//             })
//             .sort({ createdAt: -1 });

//         // Filter new arrivals for valid categories
//         const filteredProductNewArrivals = newArrivals.filter(
//             (product) => product.category
//         );

//         // Render the shop page with user data if available
//         const renderData = {
//             products: filteredProducts,
//             categories,
//             newArrivals: filteredProductNewArrivals,
//             selectedCategory,
//             sort,
//             order,
//         };

//         if (user) {
//             const userData = await User.findById(user.id); // More concise
//             console.log("User data", userData);
//             renderData.user = userData; // Add user data to render data
//         }

//         return res.render("user/shop", renderData); // Render the page with consolidated data
//     } catch (error) {
//         console.log("Shop page not loading", error);
//         res.status(500).send("Server Error");
//     }
// };
const loadShop = async (req, res) => {
    console.log("Reached shop");

    try {
        const user = req.session.user;

        const {
            sort = "",
            order = "",
            category: selectedCategory = "",
            page = 1,
            search = "", 
        } = req.query;

        const limit = 4; 
        const skip = (page - 1) * limit; 

        
        let sortOptions = {};
        if (sort) {
            sortOptions[sort] = order === "asc" ? 1 : -1; 
        }

       
        let query = { isBlocked: false };
        if (search) {
            query.productName = { $regex: new RegExp(search, "i") };
        }
        if (selectedCategory) {
            query.category = selectedCategory; 
        }

      
        const products = await Product.find(query)
            .populate({
                path: "category",
                match: { isListed: true },
            })
            .sort(sortOptions)
            .skip(skip) 
            .limit(limit);

        // Filter out products that have a blocked category
        const filteredProducts = products.filter((product) => product.category);

        // Fetch the total number of products for pagination
        const totalProducts = await Product.countDocuments(query); // Ensure totalProducts is calculated
        const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

        // Fetch listed categories for the dropdown
        const categories = await Category.find({ isListed: true }).sort({ name: 1 });

        // Fetch new arrivals
        const newArrivals = await Product.find({ isBlocked: false })
            .populate({
                path: "category",
                match: { isListed: true },
            })
            .sort({ createdAt: -1 })
            .limit(limit); // Limit to new arrivals

        // Filter new arrivals for valid categories
        const filteredProductNewArrivals = newArrivals.filter(
            (product) => product.category
        );

        // Render the shop page with user data if available
        const renderData = {
            products: filteredProducts,
            categories,
            newArrivals: filteredProductNewArrivals,
            selectedCategory,
            sort,
            order,
            currentPage: parseInt(page), // Current page number
            totalPages, // Total number of pages
            totalProducts, // Total products for the pagination display
        };

        if (user) {
            const userData = await User.findById(user.id); // More concise
            console.log("User data", userData);
            renderData.user = userData; // Add user data to render data
        }

        return res.render("user/shop", renderData); // Render the page with consolidated data
    } catch (error) {
        console.log("Shop page not loading", error);
        res.status(500).send("Server Error");
    }
};




module.exports = {
    loadHomepage,
    loadLogin,
    login,
    signup,
    loadSignup,
    pageNotFound,
    verifyOTP,
    resendOTP,
    logout,
    loadProductPage,
    loadShop,
};
