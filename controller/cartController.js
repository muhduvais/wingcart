const User = require("../model/usersModel");
const Cart = require("../model/cartModel");
const Offer = require("../model/offersModel");
require("dotenv").config();

const toCart = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId).lean();
    const cart = await Cart.findOne({ user: userId })
      .populate("products.product")
      .lean();

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.render("cart", {
        user,
        userId,
        cart: { products: [] },
        realSubtotal: 0,
        discountTotal: 0,
        subtotal: 0,
        shipping: 0,
        total: 0,
      });
    }

    const productIds = cart.products
      .map((it) => it.product && it.product._id)
      .filter(Boolean);
    const categoryIds = cart.products
      .map((it) => it.product && it.product.category)
      .filter(Boolean);

    const offers = await Offer.find({
      isActive: true,
      item: { $in: [...productIds, ...categoryIds] },
    }).lean();

    const offersByItemId = offers.reduce((acc, o) => {
      const items = Array.isArray(o.item) ? o.item : [o.item];
      items.forEach((it) => {
        const k = String(it);
        (acc[k] ||= []).push(o);
      });
      return acc;
    }, {});

    console.log("OffersByItemId: ", offersByItemId);

    let realSubtotal = 0;
    let discountTotal = 0;
    let subtotal = 0;

    const cartItems = cart.products.map((item) => {
      const product = item.product;
      const qty = item.quantity;

      console.log("ProductId: ", String(product._id));
      console.log("Category: ", String(product.category));

      const pOffers = offersByItemId[String(product._id)] || [];
      const cOffers = offersByItemId[String(product.category)] || [];
      const allOffers = [...pOffers, ...cOffers];

      console.log("allOffers: ", allOffers);

      const bestOffer = allOffers.reduce(
        (best, cur) => (cur.discount > (best.discount || 0) ? cur : best),
        { discount: 0 }
      ) || { discount: 0 };

      const originalPrice = Number(product.price);
      const discountedPrice = Number(
        (originalPrice * (1 - (bestOffer.discount || 0) / 100)).toFixed(2)
      );
      const itemTotal = Number((discountedPrice * qty).toFixed(2));

      realSubtotal += originalPrice * qty;
      discountTotal += (originalPrice - discountedPrice) * qty;
      subtotal += itemTotal;

      return {
        ...item,
        originalPrice,
        discountedPrice,
        bestOffer,
        itemTotal,
      };
    });

    realSubtotal = Number(realSubtotal.toFixed(2));
    discountTotal = Number(discountTotal.toFixed(2));
    subtotal = Number(subtotal.toFixed(2));

    const shipping = subtotal > 0 && subtotal < 500 ? 40 : 0;
    const total = Number((subtotal + shipping).toFixed(2));

    cart.products = cartItems;

    console.log("cart: ", cart);

    return res.render("cart", {
      user,
      userId,
      cart,
      realSubtotal,
      discountTotal,
      subtotal,
      shipping,
      total,
    });
  } catch (err) {
    console.error("Error fetching cart", err);
    res.status(500).send("Internal server error");
  }
};

const addToCart = async (req, res) => {
  try {
    console.log("Request received:", req.body);
    const user = await User.findById(req.session.user);
    const { productId, quantity } = req.body;

    if (!user || user.isBlocked) {
      return res.status(200).json({ user: false });
    }

    const userId = user._id;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, products: [] });
    }

    const productIndex = cart.products.findIndex(
      (p) => p.product.toString() === productId
    );

    if (productIndex > -1) {
      return res
        .status(200)
        .json({ message: "Already added to cart!", user: true });
    } else {
      cart.products.push({
        product: productId,
        quantity: parseInt(quantity, 10) || 1,
      });
      await cart.save();
      return res.status(200).json({ success: true, user: true });
    }
  } catch (err) {
    console.error("Error adding product to cart:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.product_id;
    const cart = await Cart.findOne({ user: userId });

    if (cart) {
      cart.products = cart.products.filter(
        (item) => item.product.toString() !== productId
      );
      await cart.save();
      console.log("Product removed from cart:", cart);
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    console.error("Error deleting cart item", err);
    res.status(500).send("Internal server error");
  }
};

const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user;

    let cart = await Cart.findOne({ user: userId })
      .populate("products.product")
      .lean();

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.products = cart.products.map((item) =>
      item.product._id.toString() === productId ? { ...item, quantity } : item
    );

    const productIds = cart.products.map((p) => p.product._id);
    const categoryIds = cart.products.map((p) => p.product.category);

    const offers = await Offer.find({
      isActive: true,
      item: { $in: [...productIds, ...categoryIds] },
    }).lean();

    const offersByItemId = offers.reduce((acc, o) => {
      const items = Array.isArray(o.item) ? o.item : [o.item];
      items.forEach((id) => {
        const k = String(id);
        (acc[k] ||= []).push(o);
      });
      return acc;
    }, {});

    let realSubtotal = 0;
    let discountTotal = 0;
    let subtotal = 0;

    const cartItems = cart.products.map((item) => {
      const product = item.product;
      const qty = item.quantity;

      const pOffers = offersByItemId[String(product._id)] || [];
      const cOffers = offersByItemId[String(product.category)] || [];
      const allOffers = [...pOffers, ...cOffers];

      const bestOffer = allOffers.reduce(
        (best, cur) => (cur.discount > (best.discount || 0) ? cur : best),
        { discount: 0 }
      );

      const originalPrice = product.price;
      const discountedPrice = originalPrice * (1 - bestOffer.discount / 100);
      const itemTotal = discountedPrice * qty;

      realSubtotal += originalPrice * qty;
      discountTotal += (originalPrice - discountedPrice) * qty;
      subtotal += itemTotal;

      return {
        ...item,
        originalPrice,
        discountedPrice,
        bestOffer,
        itemTotal,
      };
    });

    const shipping = subtotal > 0 && subtotal < 500 ? 40 : 0;
    const total = subtotal + shipping;

    const updatedItem = cartItems.find(
      (i) => i.product._id.toString() === productId
    );

    return res.json({
      success: true,
      updatedItem,
      cartSummary: {
        realSubtotal,
        discountTotal,
        subtotal,
        shipping,
        total,
      },
    });
  } catch (err) {
    console.error("Error updating cart", err);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  toCart,
  addToCart,
  deleteCartItem,
  updateCart,
};
