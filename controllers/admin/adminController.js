const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const moment = require('moment');
const Order = require("../../models/orderModel");
const Product = require("../../models/Productmodel");
const pageError = async (req, res) => {
    res.render("admin/pageError")

}

//adminloginpage laoding
const loadAdmin = async (req, res) => {
    try {

        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        } else {
            return res.render("admin/admin-login", { message: null })
        }

    } catch (error) {
        console.log(("unexpected error during loading login", error));
        res.redirect("/pageError")
    }
}
const login = async (req, res) => {
    try {


        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                // redirecting to dashboard
                return res.redirect('/admin/dashboard');
            } else {
                req.flash('error', 'Invalid password');
                return res.redirect('/admin/login');
            }
        } else {
            req.flash('error', 'Admin not found');
            return res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return res.redirect('/pageError');
    }
};



const loadDashboard = async (req, res) => {
    try {
        let filter = {};
        const filterType = req.query.filterType || 'yearly';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        switch (filterType) {
            case 'daily':
                filter.createdOn = {
                    $gte: moment().startOf('day').toDate(),
                    $lt: moment().endOf('day').toDate(),
                };
                break;
            case 'weekly':
                filter.createdOn = {
                    $gte: moment().startOf('week').toDate(),
                    $lt: moment().endOf('week').toDate(),
                };
                break;
            case 'yearly':
                filter.createdOn = {
                    $gte: moment().startOf('year').toDate(),
                    $lt: moment().endOf('year').toDate(),
                };
                break;
            case 'custom':
                if (startDate && endDate) {
                    filter.createdOn = {
                        $gte: startDate,
                        $lt: endDate,
                    };
                }
                break;
            default:
                break;
        }
        // graph for pie,single line ,poalr Area graphs  //
        const overallOrderAmount = await Order.aggregate([
            { $match: filter }, { $group: { _id: null, totalAmount: { $sum: "$totalPrice" } } }]);
        const overallDiscount = await Order.aggregate([
            { $match: filter }, { $group: { _id: null, totalDiscount: { $sum: "$discount" } } }]);
        const totalAmount = overallOrderAmount.length > 0 ? overallOrderAmount[0].totalAmount : 0;
        const totalDiscount = overallDiscount.length > 0 ? overallDiscount[0].totalDiscount : 0;
        const salesReport = await Order.find(filter)
        const salesCount = await Order.countDocuments(filter);

        const orderStatusCounts = await Order.aggregate([
            { $match: filter },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const orderStatusMap = {
            Processing: 0,
            Shipped: 0,
            Delivered: 0,
            Cancelled: 0,
            'Return Request': 0,
            Returned: 0
        };
        orderStatusCounts.forEach(status => {
            orderStatusMap[status._id] = status.count;
        });


        // top 5 best-selling products
        const topProducts = await Order.aggregate([
            { $match: filter },
            { $unwind: "$orderedItems" },
            { $group: { _id: "$orderedItems.productId", totalSold: { $sum: "$orderedItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            {
                $project: {
                    productName: "$product.productName",
                    totalSold: 1
                }
            }
        ]);

        // top 5 best-selling categories
        const topCategories = await Order.aggregate([
            { $match: filter },
            { $unwind: "$orderedItems" },
            { $lookup: { from: "products", localField: "orderedItems.productId", foreignField: "_id", as: "productDetails" } },
            { $unwind: "$productDetails" },
            { $group: { _id: "$productDetails.category", totalSold: { $sum: "$orderedItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
            { $unwind: "$category" },
            { $project: { categoryName: "$category.name", totalSold: 1 } }
        ]);



        // Low stock productsss       
        const lowStockProducts = await Product.aggregate([
            { $match: { quantity: { $lt: 20 } } },
            {
                $project: {
                    productName: 1,
                    quantity: 1
                }
            },
            { $sort: { quantity: 1 } }
        ]);


        res.render('admin/dashboard', {
            salesCount,
            totalAmount,
            totalDiscount,
            salesReport,
            filterType,
            startDate,
            endDate,
            orderStatusMap,
            topProducts,

            topCategories,
            lowStockProducts
        });
    } catch (error) {
        console.log("Error loading Dashboard", error);
        res.redirect("/admin/pageError")
    }
};
const logout = async (req, res) => {
    try {
        req.session.admin = false;
        // req.session.destroy();

        // ((err)=>{
        //     if(err){
        //         console.log("Error destroying session",err)
        //         return res.redirect("/pageError")
        //     }
        res.redirect("/admin/login")
    }

    catch (error) {
        console.log(("unexpected error during logout", error));
        res.redirect("/pageError")

    }
}
module.exports = {

    loadAdmin,
    login,
    loadDashboard,
    pageError,
    logout
};
