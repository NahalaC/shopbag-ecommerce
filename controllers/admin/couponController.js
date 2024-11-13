const Category=require('../../models/Categorymodel');
const Product=require('../../models/Productmodel');
const User=require('../../models/User');
const Coupon=require('../../models/coupenModel');


const getCouponListingPage=async (req, res) => {
    try {
        let search = req.query.search || "";
        const page = parseInt(req.query.page) || 1 ;
        const limit = 5;
        const skip = (page - 1) * limit;
        const coupons = await Coupon.find({code: { $regex: ".*" + search + ".*", $options: "i" }}).sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalCoupons = await Coupon.countDocuments({code: { $regex: ".*" + search + ".*", $options: "i" }})
        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('admin/coupons', 
        { 
            coupons ,
            currentPage: page,
            totalPages,
            totalCoupons,
            limit
        });
    } catch (error) {
        console.error('Error loading coupon listing page:', error);
        res.redirect("/admin/pageError")
    }
};
const loadAddCouponPage = async (req, res) => {
    try {
        res.render('admin/addCouponPage', {});
    } catch (error) {
        console.error('Error loading addCoupon page:', err);
        res.redirect("/admin/pageError")
    }
};


const addCoupon = async (req, res) => {
    try {
        const { code, expireOn, offerPrice, minimumPrice } = req.body;

       
        const trimmedCode = code.trim();

       
        const existingCoupon = await Coupon.findOne({ code: trimmedCode });
        if (existingCoupon) {
            return res.json({ success: false, message: "Coupon code already exists." });
        }

   
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const expirationDate = new Date(expireOn);

        if (expirationDate < today) {
            return res.json({ success: false, message: "Expiration date cannot be in the past." });
        }

    
        if (offerPrice >= minimumPrice) {
            return res.json({ success: false, message: "Offer price cannot be greater than or equal to the minimum price." });
        }

       
        const newCoupon = new Coupon({
            code: trimmedCode,
            expireOn,
            offerPrice,
            minimumPrice
        });

        await newCoupon.save();
        res.json({ success: true, message: "Coupon added successfully!" });
    } catch (error) {
        console.error("Error adding coupon:", error);
        res.json({ success: false, message: "An error occurred while adding the coupon." });
    }
};

const toggleCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }
        
        coupon.isActive = !coupon.isActive;
        await coupon.save();

        
        res.status(200).json({
            success: true,
            message: `Coupon has been ${coupon.isActive ? 'activated' : 'deactivated'}`,
            coupon 
        });

    } catch (error) {
        console.error('Error toggling coupon status:', error);
        res.redirect("/admin/pageError");
    }
};


 module.exports={
    getCouponListingPage,
    loadAddCouponPage,
    addCoupon,
    toggleCouponStatus
 }