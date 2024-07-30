const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    code: {
        type: String
    },
    description: {
        type: String
    },
    discount: {
        type: Number
    },
    validity: {
        type: Date
    },
    minPurchase: {
        type: Number
    },
    maxAmount: {
        type: Number
    },
});

const Coupon = mongoose.model('coupons', couponSchema);

module.exports = Coupon;