const User = require("../../models/User");
const Order = require("../../models/orderModel");
const Product = require("../../models/Productmodel");

const orderInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;


        const orders = await Order.find().populate('userId')
            .sort({ createdAt: -1 })
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

        // Update the order status in the database
        await Order.findByIdAndUpdate(orderId, { status });

        // Redirect or respond as necessary
        res.redirect("/admin/orders"); // Adjust the redirect path as needed
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send("Server Error");
    }
};


module.exports = {
    orderInfo,
    updateOrderStatus
}