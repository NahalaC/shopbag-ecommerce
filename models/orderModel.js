const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const generateOrderId = () => {
    const uuid = uuidv4().replace(/[^0-9]/g, '').slice(0, 16);
    return `#OD${uuid}`;
}

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: generateOrderId,
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderedItems: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    address: {
        addressType: { type: String, required: true },
        name: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: Number, required: true },
        phone: { type: Number, required: true },
        email: { type: String }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Wallet', 'Card', 'RazorPay'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending'],
        default: 'Pending'
    },
    razorpay: {
        paymentId: { type: String },
        orderId: { type: String }
    },
    InvoiceDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied: {
        type: Boolean,
        default: false
    }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
