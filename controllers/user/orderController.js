const Order = require("../../models/orderModel");
const uuid = require("uuid");
const User = require("../../models/User");
const Product = require("../../models/Productmodel");
const Cart = require("../../models/cartModel");
const Address = require("../../models/Addressmodel")


const orderSuccess = async (req, res) => {
    try {
        const orderId = req.query.orderId
        console.log('ppppppp', req.query)
        res.render('user/orderSuccess', { orderId })
    } catch (error) {
        console.error('Error while loading order Success page', error);
        res.redirect("/page-404")
    }
};


const orderDetails = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        if (!orderId) {
            return res.status(400).send('Order ID is required');
        }


        const order = await Order.findById(orderId).populate({
            path: 'orderedItems.productId',
            select: 'productName productImages'
        });
        if (!order) {
            return res.status(404).send('Order not found');
        }


        res.render("user/orderDetails", { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order can be canceled based on status
        if (order.status !== 'Pending' && order.status !== 'Shipped') {
            return res.status(400).json({ message: 'Order cannot be canceled' });
        }

        // Update order status to 'Cancelled'
        order.status = 'Cancelled';
        await order.save();

        // Adjust product quantity back based on the canceled order
        for (let item of order.orderedItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity += item.quantity; // Increase the product quantity
                await product.save();
            }
        }

        return res.status(200).json({ message: 'Order canceled successfully' });
    } catch (error) {
        console.error('Order cancellation error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const page = parseInt(req.query.page) || 1; // Get current page or default to 1
        const limit = 3; // Number of orders per page
        const skip = (page - 1) * limit; // Number of orders to skip
        
        const ordersCount = await Order.countDocuments({ userId }); // Total number of orders
        const totalPages = Math.ceil(ordersCount / limit); // Total number of pages

        // Fetch orders with pagination
        const orders = await Order.find({ userId })
            
           
            .sort({ createdOn: -1 })
            .limit(limit)
            .skip(skip)
            .populate({
                path:'orderedItems.productId',
                select:'productName productImage'
            })

            console.log("orderssss",orders[0])

        res.render('user/orders', { 
            orders, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.redirect("/user/page-404");
    }
};

module.exports = {
    orderSuccess,
    orderDetails,
    cancelOrder,
    getOrders
}