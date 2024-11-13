const Cart = require("../../models/cartModel");
const User = require("../../models/User");
const Address = require("../../models/Addressmodel");
const Product = require("../../models/Productmodel");
const Order = require("../../models/orderModel");
const Coupon = require("../../models/coupenModel");
const Wallet = require("../../models/walletModel");
const mongoose = require("mongoose");

const Razorpay = require("razorpay");
require("dotenv").config();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

const getCheckout = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user || !user.id) {
      return res.redirect("/login");
    }

    const userData = await User.findById(user.id);
    if (!userData) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId: user.id }).populate(
      "items.productId"
    );
    if (!cart || !cart.items.length) {
      return res.redirect("/cart");
    }

    const productIds = cart.items
      .map((item) => (item.productId ? item.productId._id : null))
      .filter((id) => id !== null);
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

    const shippingCharge = subtotal > 500 ? 0 : 50;
    const total = subtotal + shippingCharge;

    const coupons = await Coupon.find({
      isActive: true,
      expireOn: { $gte: new Date() },
    });
    const wallet = await Wallet.findOne({ userId: user.id });
    const walletBalance = wallet ? wallet.balance : 0;

    let discount = 0;
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon });
      if (coupon) {
        discount = coupon.offerPrice;
      }
    }

    res.render("user/checkout", {
      user: userData,
      cartItems: cart.items,
      subtotal,
      shippingCharge,
      total,
      discount,
      addresses: addressData ? addressData.address : [],
      products: cart.items,
      coupons,
      walletBalance,
    });
  } catch (error) {
    console.error(error.message, "Error loading checkout");
    res.status(500).send("Internal server error");
  }
};

const applyCoupon = async (req, res) => {
  const { code, total } = req.body;
  const userId = req.session.user.id;

  try {
    console.log(
      `Applying coupon: ${code} for user: ${userId} with total: ${total}`
    );

    const coupon = await Coupon.findOne({ code: code, isActive: true });
    console.log(`Coupon found: ${coupon}`);

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or inactive coupon code." });
    }

    if (new Date() > coupon.expireOn) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon has expired." });
    }

    if (total < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minimumPrice} is required to use this coupon.`,
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found." });
    }

    // Calculate the total discount amount
    let discountAmount = coupon.offerPrice;
    let remainingDiscount = discountAmount;

    // Calculate the total original price of items
    let totalItemPrice = 0;
    cart.items.forEach((item) => {
      totalItemPrice += item.productId.salePrice * item.quantity;
    });

    // Distribute discount across each item proportionally
    cart.items.forEach((item) => {
      const itemTotalPrice = item.productId.salePrice * item.quantity;
      const itemDiscount = (itemTotalPrice / totalItemPrice) * discountAmount;
      const discountedItemPrice = itemTotalPrice - itemDiscount;

      // Store the discount and new total for each item
      item.discountedPrice = discountedItemPrice;
      item.itemDiscount = itemDiscount;

      // Deduct from the remaining discount
      remainingDiscount -= itemDiscount;
    });

    // Update the overall cart total and save changes
    cart.couponApplied = true;
    cart.total = total - discountAmount;

    await cart.save();

    console.log(`Coupon applied successfully. New total: ${cart.total}`);

    return res.json({
      success: true,
      newTotal: cart.total.toFixed(2),
      discount: discountAmount.toFixed(2),
      message: "Coupon applied successfully!",
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};


const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found." });
    }

    if (!req.session.appliedCoupon) {
      return res
        .status(400)
        .json({ success: false, message: "No coupon applied." });
    }

    const originalTotal = req.session.originalTotal;
    cart.total = originalTotal;

    cart.items.forEach((item) => {
      item.totalPrice = item.quantity * item.price;
    });
    cart.couponApplied = false;

    req.session.appliedCoupon = null;
    req.session.originalTotal = null;

    await cart.save();

    return res.json({
      success: true,
      newTotal: originalTotal.toFixed(2),
      message: "Coupon removed successfully!",
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};



const placeOrder = async (req, res) => {
  try {
    console.log("Received order data:", req.body);

    const cart = await Cart.findOne({ userId: req.session.user.id });
    if (!cart || !cart.items.length) {
      return res
        .status(400)
        .json({ success: false, message: "Your cart is empty." });
    }

    const { selectedAddressId, paymentMethod, appliedCoupon, orderedItems } =
      req.body;

    const selectedAddress = await Address.findOne(
      { userId: req.session.user.id, "address._id": selectedAddressId },
      { "address.$": 1 }
    );
    if (!selectedAddress || !selectedAddress.address.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address selected." });
    }
    const address = selectedAddress.address[0];

    // Update: Correct subtotal calculation for multiple items
    let subtotal = orderedItems.reduce(
      (total, item) => total + (item.price * item.quantity),
      0
    );
    console.log("Subtotal before discount:", subtotal);

    let discount = 0;
    let couponApplied = false;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({
        code: appliedCoupon,
        isActive: true,
        expireOn: { $gt: new Date() }, // Ensuring the coupon is not expired
      });
      if (coupon && subtotal >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        couponApplied = true;
        console.log("Coupon applied successfully. New total:", subtotal - discount);
      } else {
        console.log("Coupon not applied: either expired or does not meet the minimum price.");
      }
    }
    // Applying the discount
    subtotal -= discount;
    subtotal = Math.max(subtotal, 0);  // Ensuring subtotal doesn't go negative
    console.log("Subtotal after discount:", subtotal);

    const shippingCharge = subtotal < 500 ? 50 : 0;
    console.log("Shipping Charge:", shippingCharge);

    const finalTotal = subtotal + shippingCharge;

    const newOrder = new Order({
      userId: req.session.user.id,
      address,
      paymentMethod,
      subtotal,
      totalPrice: finalTotal,
      orderedItems,
      status: "Pending",
      couponApplied,
      discount,
      createdOn: new Date(),
    });

    let savedOrder;
    try {
      savedOrder = await newOrder.save();
      console.log("Order saved:", savedOrder);
    } catch (error) {
      console.error("Error saving order:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to save order." });
    }

    // Process wallet payment if selected
    if (paymentMethod === "Wallet") {
      try {
        let wallet = await Wallet.findOne({ userId: newOrder.userId });
        if (!wallet) {
          return res
            .status(404)
            .json({ success: false, message: "Wallet not found." });
        }

        const newBalance = wallet.balance - finalTotal;
        if (newBalance < 0) {
          return res
            .status(400)
            .json({ success: false, message: "Insufficient wallet balance." });
        }

        wallet.balance = newBalance;
        wallet.transactions.push({
          amount: finalTotal,
          type: "debit",
          orderId: savedOrder._id,
          description: `Purchased products for Order ID: ${savedOrder._id}`,
        });

        await wallet.save();
        savedOrder.paymentStatus = "Paid";
        await savedOrder.save();
      } catch (error) {
        console.error("Error processing wallet transaction:", error);
        return res
          .status(500)
          .json({
            success: false,
            message: "Failed to process wallet transaction.",
          });
      }
    }

    // Update stock for each product in the order
    for (const item of orderedItems) {
      try {
        const product = await Product.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          if (product.quantity < 0) {
            return res
              .status(400)
              .json({ message: `Not enough stock for ${product.productName}` });
          }
          await product.save();
        } else {
          return res.status(404).json({ message: "Product not found" });
        }
      } catch (error) {
        console.error(
          `Error updating stock for product ${item.productId}:`,
          error
        );
        return res
          .status(500)
          .json({
            success: false,
            message: "Error updating stock for products",
          });
      }
    }

    // Clear the cart after successful order
    try {
      await Cart.deleteOne({ userId: req.session.user.id });
      req.session.cart = [];
    } catch (error) {
      console.error("Error clearing cart:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to clear cart." });
    }

    req.session.appliedCoupon = null;
    req.session.originalTotal = null;

    return res.json({
      success: true,
      message: "Order placed successfully!",
      orderId: savedOrder._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error placing order" });
  }
};

const createRazorpayOrder = async (req, res) => {
  const { totalPrice } = req.body;

  if (!totalPrice || typeof totalPrice !== "number") {
    return res.status(400).json({
      success: false,
      message: "Invalid totalPrice",
    });
  }

  try {
    const orderOptions = {
      amount: Math.round(totalPrice * 100),
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1,
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      key_id: process.env.RAZORPAY_ID_KEY,
      user: req.session.userName,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};

const handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, orderId, paymentStatus } = req.body;


    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }


    if (paymentStatus === "Paid") {
      order.paymentStatus = "Paid";
      order.paymentMethod = "RazorPay";
      order.razorpay = { paymentId, razorpayOrderId };
    } else {
      order.paymentStatus = "Pending";
      order.paymentMethod = "RazorPay";
      order.razorpay = { paymentId: null, razorpayOrderId };
    }

    await order.save();

    res.status(200).json({
      success: true,
      message:
        paymentStatus === "Paid"
          ? "Order placed successfully"
          : "Payment failed, order placed with pending status.",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error handling payment result:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process payment.",
    });
  }
};

module.exports = {
  getCheckout,
  applyCoupon,
  placeOrder,
  removeCoupon,
  createRazorpayOrder,
  handlePaymentSuccess,
};

