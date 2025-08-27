const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Coupon = require("../model/couponsModel");
const Offer = require("../model/offersModel");

const toOffersAndCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    const offers = await Offer.find({}).populate("item");
    const products = await Product.find({})
      .populate("category")
      .populate("brand");

    const categories = await Category.find({ isListed: true });

    if (!coupons && !offers) {
      return res.render("offersAndCoupons");
    }

    if (!coupons) {
      return res.render("offersAndCoupons", { offers, products, categories });
    }

    if (!offers) {
      return res.render("offersAndCoupons", { coupons });
    }

    res.render("offersAndCoupons", { coupons, offers, products, categories });
  } catch (error) {
    console.error("Error fetching offers and coupons", error);
    res.status(500).send("Internal server error");
  }
};

const toCreateCoupon = async (req, res) => {
  try {
    res.render("addCoupon");
  } catch (error) {
    console.error("Error fetching add coupon", error);
    res.status(500).send("Internal server error");
  }
};

const verifyCreateCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      description,
      discount,
      minPurchase,
      maxAmount,
      validity,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ code: couponCode });

    if (existingCoupon) {
      return res.status(400).json({ success: false, exist: true });
    }

    const coupon = new Coupon({
      code: couponCode,
      description,
      discount,
      minPurchase,
      maxAmount,
      validity,
    });

    await coupon.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating coupon", error);
    res.status(500).json({ success: false });
  }
};

const verifyEditCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      description,
      discount,
      minPurchase,
      maxAmount,
      validity,
    } = req.body;
    const couponId = req.params.coupon_id;

    const existingCoupon = await Coupon.findOne({
      code: couponCode,
      _id: { $ne: couponId },
    });

    if (existingCoupon) {
      return res.status(400).json({ success: false, exist: true });
    }

    await Coupon.findByIdAndUpdate(couponId, {
      code: couponCode,
      description: description,
      discount: discount,
      minPurchase: minPurchase,
      maxAmount: maxAmount,
      validity: validity,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error editing coupon", error);
    res.status(500).json({ success: false });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.coupon_id;
    await Coupon.findByIdAndDelete(couponId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon", error);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  toOffersAndCoupons,
  toCreateCoupon,
  verifyCreateCoupon,
  verifyEditCoupon,
  deleteCoupon,
};
