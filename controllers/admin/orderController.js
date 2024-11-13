const User = require("../../models/User");
const Order = require("../../models/orderModel");
const Product = require("../../models/Productmodel");

const orderInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;


        const orders = await Order.find().populate('userId')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);


        const totalOrders = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrders / limit);


        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error('Error while loading order listing page:', error);
        res.redirect("/admin/pageError");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        await Order.findByIdAndUpdate(orderId, { status });

        res.redirect("/admin/orders");
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send("Server Error");
    }
};
const orderDetails = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const order = await Order.findById(orderId).populate('orderedItems.productId');
        if (!order) {
            return res.redirect("/admin/pageError")
        }
        res.render('admin/orderDetailed', {
            order,
        });
    } catch (error) {
        console.error('Error while loading order detail page', error);
        res.redirect("/admin/pageError")
    }
};




module.exports = {
    orderInfo,
    updateOrderStatus,
    orderDetails,
    
}