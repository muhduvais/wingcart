const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Coupon = require("../model/couponsModel");
const Offer = require("../model/offersModel");
const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

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
    console.error(MESSAGES.ERRORS.FETCH_OFFERS_COUPONS, error);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toCreateCoupon = async (req, res) => {
  try {
    res.render("addCoupon");
  } catch (error) {
    console.error(MESSAGES.ERRORS.FETCH_ADD_COUPON, error);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
      return res.status(STATUS.BAD_REQUEST).json({ success: false, exist: true });
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
    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.CREATE_COUPON, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false });
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
      return res.status(STATUS.BAD_REQUEST).json({ success: false, exist: true });
    }

    await Coupon.findByIdAndUpdate(couponId, {
      code: couponCode,
      description: description,
      discount: discount,
      minPurchase: minPurchase,
      maxAmount: maxAmount,
      validity: validity,
    });

    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.EDIT_COUPON, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.coupon_id;
    await Coupon.findByIdAndDelete(couponId);
    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.DELETE_COUPON, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false });
  }
};

module.exports = {
  toOffersAndCoupons,
  toCreateCoupon,
  verifyCreateCoupon,
  verifyEditCoupon,
  deleteCoupon,
};
