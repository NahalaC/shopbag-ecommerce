const Cart = require("../../models/cartModel");
const User = require("../../models/User");
const Address = require("../../models/Addressmodel");
const Product = require("../../models/Productmodel")
const Order = require("../../models/orderModel")
const mongoose = require("mongoose");
const getCheckout = async (req, res) => {
    try {
        const user = req.session.user;


        if (!user || !user.id) {
            console.log("No user session found or missing user ID");
            return res.redirect("/login");
        }

        const userData = await User.findById(user.id);
        if (!userData) {
            console.log("User not found:", user.id);
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({ userId: user.id }).populate("items.productId");
        if (!cart || !cart.items.length) {
            return res.redirect("/cart");
        }


        const productIds = cart.items.map(item => item.productId ? item.productId._id : null).filter(id => id !== null);
        const existingProducts = await Product.find({ _id: { $in: productIds } });

        const addressData = await Address.findOne({ userId: user.id });



        let subtotal = 0;


        cart.items.forEach((item) => {

            if (item.productId) {

                if (item.productId.salePrice !== undefined) {
                    subtotal += item.productId.salePrice * item.quantity;
                } else {
                    console.log("Missing salePrice for item:", item);
                }
            } else {
                console.log("Invalid productId for item:", item);
            }
        });


        const shippingCharge = subtotal > 500 ? 0 : 60;
        const total = subtotal + shippingCharge;

        res.render("user/checkout", {
            user: userData,
            cartItems: cart.items,
            subtotal,
            shippingCharge,
            total,
            addresses: addressData ? addressData.address : [],
            products: cart.items
        });
    } catch (error) {
        console.error(error.message, "Error loading checkout");
        res.status(500).send("Internal server error");
    }
};






const placeOrder = async (req, res) => {
    try {


        // if (!req.user || !req.user._id) {
        //     return res.status(401).json({ success: false, message: 'User not authenticated. Please log in.' });
        // }

        // Get cart items from the session (or database, depending on your setup)
        const cart = await Cart.findOne({ userId: req.session.user.id })
        if (!cart || cart.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty.' });
        }

        const { addressId, paymentMethod, subtotal, total } = req.body;

        console.log('cartt:', cart.items)

        const selectedAddress = await Address.findOne({ userId: req.session.user.id, 'address._id': addressId }, { 'address.$': 1 });
        const address = selectedAddress.address[0];

        if (!selectedAddress) {
            return res.status(400).json({ success: false, message: 'Invalid address selected.' });
        }

        const orderItems = cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
        }));

        const newOrder = new Order({
            userId: req.session.user.id,
            address,
            paymentMethod,
            subtotal,
            totalPrice: total,
            orderedItems: orderItems,
            status: 'Pending'
        });
        console.log('order items:', orderItems)


        await newOrder.save();
        for (const item of orderItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity -= item.quantity;
                if (product.quantity < 0) {
                    return res.status(400).send({ message: `Not enough stock for ${product.productName}` });
                }
                await product.save();
            } else {
                return res.status(404).send({ message: 'Product not found' });

            }
        }
        await Cart.deleteOne({ userId: req.session.user.id });


        req.session.cart = [];
        console.log(newOrder.orderId)

        return res.json({ success: true, message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Error placing order' });
    }
};



module.exports = {
    getCheckout,
    placeOrder
}