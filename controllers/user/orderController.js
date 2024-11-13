const Order = require("../../models/orderModel");
const uuid = require("uuid");
const User = require("../../models/User");
const Product = require("../../models/Productmodel");
const Cart = require("../../models/cartModel");
const Address = require("../../models/Addressmodel")
const Wallet = require("../../models/walletModel");
const pdf = require('html-pdf');
const path = require('path');
const ejs = require('ejs');


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


        if (order.status !== 'Pending' && order.status !== 'Shipped') {
            return res.status(400).json({ message: 'Order cannot be canceled' });
        }


        order.status = 'Cancelled';
        await order.save();


        for (let item of order.orderedItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }


        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: 0,
                transactions: []
            });
        }


        const refundAmount = order.totalPrice;


        wallet.balance += refundAmount;


        wallet.transactions.push({
            amount: refundAmount,
            type: 'credit',
            description: `Refund for cancelled order #${order.orderId}`,
            orderId: order._id,
        });


        await wallet.save();

        return res.status(200).json({ message: 'Order canceled and refund added to wallet' });
    } catch (error) {
        console.error('Order cancellation error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
const returnRequest = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        if (order.status === 'Returned') {
            return res.status(400).json({
                success: false,
                message: 'Order is already returned'
            });
        }

        order.status = 'Return Request';
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Order return requested successfully'
        });
    } catch (error) {
        console.error('Error while requesting order return:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to request order return',
            error: error.message
        });
    }
};


const getOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const ordersCount = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(ordersCount / limit);

        const orders = await Order.find({ userId })


            .sort({ createdOn: -1 })
            .limit(limit)
            .skip(skip)
            .populate({
                path: 'orderedItems.productId',
                select: 'productName productImage'
            })

        console.log("orderssss", orders[0])

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

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const order = await Order.findById(orderId).populate('orderedItems.productId');
        if (!order) {
            return res.redirect("/pageNotFound");
        }
        const html = await ejs.renderFile(path.join(__dirname, '../../views/user/invoiceTemplate.ejs'), { order });
        const options = {
            format: 'A4',
            border: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        pdf.create(html, options).toStream((err, stream) => {
            if (err) {
                console.error('Error while generating PDF:', err);
                res.redirect("/pageNotfound")
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order.orderId}.pdf`);
            stream.pipe(res);
        });

    } catch (error) {
        console.error('Error while downloading invoice:', error);
        res.redirect("/pageNotfound")
    }
};


module.exports = {
    orderSuccess,
    orderDetails,
    cancelOrder,
    returnRequest,
    getOrders,
    downloadInvoice
}