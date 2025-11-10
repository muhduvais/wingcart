const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Cart = require("../model/cartModel");
const Wishlist = require("../model/wishlistModel");
require("dotenv").config();

const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const toWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    let wishlist = await Wishlist.findOne({ user: userId }).populate(
      "products.product"
    );

    const cart = await Cart.findOne({ user: userId }).populate(
      "products.product"
    );
    let subtotal = 0;

    if (cart) {
      subtotal = cart.products.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
    }

    const cartProductIds = cart
      ? cart.products.map((item) => item.product._id.toString())
      : [];

    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        (item) => !cartProductIds.includes(item.product._id.toString())
      );
      await wishlist.save();
    }

    const wishlistProductIds = wishlist
      ? wishlist.products.map((item) => item.product._id)
      : [];

    const products = await Product.find({
      _id: { $in: wishlistProductIds },
      isListed: true,
    })
      .populate({
        path: "category",
        match: { isListed: true },
      })
      .populate({
        path: "brand",
        match: { isListed: true },
      });

    res.render("wishlist", {
      user,
      userId,
      cart,
      subtotal,
      products,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_WISHLIST, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const productId = req.params.product_id;

    const cart = await Cart.findOne({ user: user._id });
    if (cart) {
      const isInCart = cart.products.some(
        (item) => item.product.toString() === productId
      );
      if (isInCart) {
        return res.status(STATUS.OK).json({
          success: false,
          inCart: true,
          message: MESSAGES.WISHLIST.PRODUCT_IN_CART,
        });
      }
    }

    let wishlist = await Wishlist.findOne({ user: user._id });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: user._id,
        products: [],
      });
    }

    const existingProduct = wishlist.products.find(
      (item) => item.product.toString() === productId
    );
    if (existingProduct) {
      return res.status(STATUS.OK).json({
        success: false,
        existing: true,
        message: MESSAGES.WISHLIST.ALREADY_ADDED,
      });
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();

    res.status(STATUS.OK).json({ success: true, message: MESSAGES.WISHLIST.ADDED });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADD_WISHLIST, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.product_id;

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.WISHLIST.NOT_FOUND });
    }

    wishlist.products = wishlist.products.filter(
      (item) => item.product.toString() !== productId
    );

    await wishlist.save();

    res.status(STATUS.OK).json({ success: true, message: MESSAGES.WISHLIST.REMOVED });
  } catch (err) {
    console.error(MESSAGES.ERRORS.REMOVE_WISHLIST, err);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

module.exports = {
  toWishlist,
  addToWishlist,
  removeFromWishlist,
};
