const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Category = require("../model/categoriesModel");
const Address = require("../model/addressesModel");
const Cart = require("../model/cartModel");
const Payment = require("../model/paymentModel");
const Order = require("../model/ordersModel");
const Coupon = require("../model/couponsModel");
const Offer = require("../model/offersModel");
const Wishlist = require("../model/wishlistModel");
const Wallet = require("../model/walletsModel");
require("dotenv").config();

const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const userHome = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    if (!user) {
      console.warn(MESSAGES.USER.NOT_FOUND);
    }

    let wishlist = await Wishlist.findOne({ user: user?._id });
    if (!wishlist && user) {
      wishlist = new Wishlist({ user: user._id, products: [] });
      await wishlist.save();
    }

    let wallet = await Wallet.findOne({ user: user?._id });
    if (!wallet && user) {
      wallet = new Wallet({ user: user._id, balance: 0, transactions: [] });
      await wallet.save();
    }

    const paymentMethod = await Payment.find({ user: user?._id });
    const paymentTypes = ["Cash on delivery", "Razorpay", "Wallet"];

    for (let type of paymentTypes) {
      const existingMethod = paymentMethod.find(
        (method) => method.type === type
      );
      if (!existingMethod && user) {
        await new Payment({ user: user._id, type: type, details: null }).save();
      }
    }

    const offers = await Offer.find({ isActive: true }).populate("item");

    const products = await Product.find({ isListed: true })
      .populate("category", null, { isListed: true })
      .populate("brand", null, { isListed: true })
      .populate("offers");

    const filteredProducts = products.filter(
      (product) => product.category && product.brand
    );

    const newArrivals = await Product.find()
      .sort({ addedDate: -1 })
      .limit(10)
      .populate("offers");

    const mostPurchased = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          count: { $sum: "$products.quantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const mostPurchasedProducts = await Product.find({
      _id: { $in: mostPurchased.map((item) => item._id) },
    }).populate("offers");

    const categories = await Category.find({});
    const menCategory = await Category.findOne({ name: "Men" });
    const womenCategory = await Category.findOne({ name: "Women" });

    if (!menCategory || !womenCategory) {
      console.warn("Men or Women category not found");
    }

    const mostPurchasedMen = await Product.find({
      _id: { $in: mostPurchased.map((item) => item._id) },
      category: menCategory?._id,
    }).populate("offers");

    const mostPurchasedWomen = await Product.find({
      _id: { $in: mostPurchased.map((item) => item._id) },
      category: womenCategory?._id,
    }).populate("offers");

    const attachBestOffer = (list) =>
      list.map((product) => {
        const bestOffer = getBestProductOffer(product, offers);
        product.bestOffer = bestOffer;
        product.finalPrice = bestOffer
          ? product.price - product.price * (bestOffer.discount / 100)
          : product.price;
        return product;
      });

    const response = {
      products: attachBestOffer(filteredProducts),
      newArrivals: attachBestOffer(newArrivals),
      mostPurchasedProducts: attachBestOffer(mostPurchasedProducts),
      mostPurchasedMen: attachBestOffer(mostPurchasedMen),
      mostPurchasedWomen: attachBestOffer(mostPurchasedWomen),
      categories,
    };

    if (user) {
      const cart = await Cart.findOne({ user: user._id }).populate(
        "products.product"
      );
      response.user = user;
      response.cart = cart;
      response.subtotal = cart
        ? cart.products.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          )
        : 0;
    }

    res.render("home", response);
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_HOME, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const userAbout = async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      res.render("about", { user });
    } else {
      successMsg = req.query.successMsg;
      res.render("login", { successMsg });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_ABOUT, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const userContact = async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      res.render("contact", { user });
    } else {
      successMsg = req.query.successMsg;
      res.render("login", { successMsg });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_CONTACT, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const isNewProduct = (addedDate) => {
  const currentDate = new Date();
  const twoDaysAgo = new Date(currentDate);
  twoDaysAgo.setDate(currentDate.getDate() - 2);
  return addedDate >= twoDaysAgo;
};

const getBestOffer = (product, offers) => {
  if (!product.offers || product.offers.length === 0) {
    return null;
  }

  const relevantOffers = offers.filter((offer) =>
    product.offers.includes(offer._id)
  );
  const productOffers = relevantOffers.filter(
    (offer) => offer.type === "products" && offer.isActive
  );
  const categoryOffers = relevantOffers.filter(
    (offer) => offer.type === "categories" && offer.isActive
  );
  const allActiveOffers = [...productOffers, ...categoryOffers];
  const bestOffer = allActiveOffers.reduce(
    (maxOffer, offer) =>
      offer.discount > maxOffer.discount ? offer : maxOffer,
    { discount: 0 }
  );

  return bestOffer.discount > 0 ? bestOffer : null;
};

const getBestProductOffer = (product, offers) => {
  if (!product.offers || product.offers.length === 0) {
    return null;
  }

  const relevantOffers = product.offers
    .map((o) => {
      if (typeof o === "object" && o._id) {
        return o;
      } else {
        return offers.find((offer) => offer._id.toString() === o.toString());
      }
    })
    .filter(Boolean);

  const productOffers = relevantOffers.filter(
    (offer) => offer.type === "products" && offer.isActive
  );
  const categoryOffers = relevantOffers.filter(
    (offer) => offer.type === "categories" && offer.isActive
  );

  const allActiveOffers = [...productOffers, ...categoryOffers];

  const bestOffer = allActiveOffers.reduce(
    (maxOffer, offer) =>
      offer.discount > maxOffer.discount ? offer : maxOffer,
    { discount: 0 }
  );

  return bestOffer.discount > 0 ? bestOffer : null;
};

const toshop = async (req, res) => {
  try {
    const sortBy = req.query.sortby || "featured";
    const searchVal = req.query.searchVal || "";
    const user = await User.findById(req.session.user);
    const offers = await Offer.find().populate("item");

    const listedCategories = await Category.find({ isListed: true }).select(
      "_id"
    );
    const listedBrands = await Brand.find({ isListed: true }).select("_id");
    const filterCategories = req.query.filterCategories
      ? [].concat(req.query.filterCategories)
      : [];
    const filterBrands = req.query.filterBrands
      ? [].concat(req.query.filterBrands)
      : [];
    const filter = { isListed: true };

    const categoryFilter =
      filterCategories.length > 0
        ? {
            $in: filterCategories.filter((cat) =>
              listedCategories.map((lc) => lc._id.toString()).includes(cat)
            ),
          }
        : { $in: listedCategories.map((cat) => cat._id) };

    const brandFilter =
      filterBrands.length > 0
        ? {
            $in: filterBrands.filter((brand) =>
              listedBrands.map((lb) => lb._id.toString()).includes(brand)
            ),
          }
        : { $in: listedBrands.map((brand) => brand._id) };

    if (categoryFilter.$in.length > 0) {
      filter.category = categoryFilter;
    }

    if (brandFilter.$in.length > 0) {
      filter.brand = brandFilter;
    }

    if (searchVal) {
      filter.description = { $regex: searchVal, $options: "i" };
    }

    const brands = await Brand.find({ isListed: true });
    const categories = await Category.find({});

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const totalProductsCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProductsCount / limit);

    let products;

    const collation = { locale: "en", strength: 2 };

    if (sortBy === "newArrivals") {
      products = await Product.find(filter)
        .sort({ addedDate: -1 })
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    } else if (sortBy === "popularity") {
      const popular = await Order.aggregate([
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.product",
            count: { $sum: "$products.quantity" },
          },
        },
        { $sort: { count: -1 } },
      ]);
      const popularProductIds = popular.map((item) => item._id);

      const popularProducts = await Product.find({
        ...filter,
        _id: { $in: popularProductIds },
      })
        .populate("category")
        .populate("brand")
        .limit(limit);

      const otherProducts = await Product.find({
        ...filter,
        _id: { $nin: popularProductIds },
      })
        .populate("category")
        .populate("brand")
        .limit(limit);

      products = [...popularProducts, ...otherProducts].slice(0, limit);
    } else if (sortBy === "highToLow") {
      products = await Product.find(filter)
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    } else if (sortBy === "lowToHigh") {
      products = await Product.find(filter)
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    } else if (sortBy === "ascending") {
      products = await Product.find(filter)
        .collation(collation)
        .sort({ name: 1 })
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    } else if (sortBy === "descending") {
      products = await Product.find(filter)
        .collation(collation)
        .sort({ name: -1 })
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    } else {
      products = await Product.find(filter)
        .populate("category")
        .populate("brand")
        .skip(skip)
        .limit(limit);
    }

    products.forEach((product) => {
      const bestOffer = getBestOffer(product, offers);
      if (bestOffer) {
        const discount = bestOffer.discount || 0;
        product.finalPrice = product.price - product.price * (discount / 100);
      } else {
        product.finalPrice = product.price;
      }
    });

    if (sortBy === "highToLow") {
      products = products.sort((a, b) => b.finalPrice - a.finalPrice);
    } else if (sortBy === "lowToHigh") {
      products = products.sort((a, b) => a.finalPrice - b.finalPrice);
    }

    if (user) {
      const wishlist = await Wishlist.findOne({ user: user._id });
      const wishProductIds = wishlist.products.map((item) =>
        item.product.toString()
      );

      products.forEach((product) => {
        const bestOffer = getBestOffer(product, offers);
        product.bestOffer = bestOffer;
        product.finalPrice = bestOffer
          ? product.price - product.price * (bestOffer.discount / 100)
          : product.price;
      });

      products.forEach((product) => {
        product.bestOffer = getBestOffer(product, offers);
      });
    }

    if (!user) {
      res.render("shop", {
        products,
        categories,
        sortBy,
        currentPage: page,
        totalPages,
        totalProductsCount,
        brands,
        isNewProduct,
        filterCategories,
        filterBrands,
        searchVal,
      });
    } else {
      const cart = await Cart.findOne({ user: user._id }).populate(
        "products.product"
      );
      let subtotal = 0;

      if (cart) {
        subtotal = cart.products.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      }
      res.render("shop", {
        user,
        products,
        cart,
        subtotal,
        categories,
        sortBy,
        currentPage: page,
        totalPages,
        totalProductsCount,
        brands,
        isNewProduct,
        filterCategories,
        filterBrands,
        searchVal,
      });
    }
  } catch (err) {
    console.error(err, "Error rendering shop");
  }
};

const toProdDetails = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const offers = await Offer.find().populate("item");

    const product = await Product.findOne({ _id: req.params.product_id })
      .populate("category")
      .populate("offers");

    const bestOffer = getBestProductOffer(product, offers);
    product.bestOffer = bestOffer;
    product.finalPrice = bestOffer
      ? product.price - product.price * (bestOffer.discount / 100)
      : product.price;

    console.log("bestOffer: ", bestOffer);
    console.log("product: ", product);

    const category = product.category;
    const recomProducts = await Product.find({
      category,
      _id: { $ne: req.params.product_id },
    });
    let subtotal = 0;
    if (user) {
      const wishlist = await Wishlist.findOne({ user: user._id });
      const wishProductIds = wishlist.products.map((item) =>
        item.product.toString()
      );
      if (wishProductIds.includes(product._id.toString())) {
        product.wished = true;
      } else {
        product.wished = false;
      }
      console.log(product.wished);
    }
    if (!user) {
      res.render("prodDetails", {
        user: false,
        product,
        recomProducts,
        subtotal,
        isNewProduct,
      });
      return;
    }
    const cart = await Cart.findOne({ user: user._id }).populate(
      "products.product"
    );
    if (cart) {
      subtotal = cart.products.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
    }

    res.render("prodDetails", {
      user,
      cart,
      product,
      recomProducts,
      subtotal,
      isNewProduct,
    });
  } catch (err) {
    console.error(err, "Error rendering product details");
  }
};

const toUserProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("userProfile", { user, userId });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).send("Internal server error");
  }
};

const toEditProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("userEditProfile", { user, userId });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).send("Internal server error");
  }
};

const editProfile = async (req, res) => {
  try {
    const { fname, lname, age, phone, email } = req.body;
    const userId = req.session.user;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(STATUS.NOT_FOUND).json({ message: MESSAGES.USER.NOT_FOUND });
    } else if (
      fname === user.fname &&
      lname === user.lname &&
      age === user.age &&
      phone === user.phone &&
      email === user.email
    ) {
      return res.status(STATUS.OK).json({ message: MESSAGES.USER.NO_CHANGES });
    }

    if (email) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.USER.INVALID_EMAIL });
      }
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res
          .status(STATUS.CONFLICT)
          .json({ message: MESSAGES.USER.EMAIL_EXISTS });
      }
    }

    const updates = {};
    if (fname && fname !== user.fname) updates.fname = fname;
    if (lname && lname !== user.lname) updates.lname = lname;
    if (age && age !== user.age) updates.age = age;
    if (phone && phone !== user.phone) updates.phone = phone;
    if (email && email !== user.email) updates.email = email;

    await User.findByIdAndUpdate(userId, { $set: updates });
    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.EDIT_PROFILE, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "products.product",
      populate: {
        path: "offers",
        match: { isActive: true },
      },
    });
    const addresses = await Address.find({ user: userId });

    const orders = await Order.find({ user: userId }, { "coupon.code": 1 });

    const coupons = await Coupon.find({});
    let paymentMethod = await Payment.find({ user: userId });

    paymentMethod = await Payment.find({ user: userId });

    if (cart) {
      let subtotal = 0;
      let totalOfferDiscount = 0;

      // Calculate subtotal and total offer discount
      for (const item of cart.products) {
        const productPrice = item.product.price || 0;
        const quantity = item.quantity || 0;
        let discountedPrice = productPrice;
        let bestOfferDiscount = 0;

        const productOffers = item.product.offers || [];
        const categoryOffers = await Offer.find({
          item: item.product.category,
          isActive: true,
        });

        const allOffers = [...productOffers, ...categoryOffers];

        for (const offer of allOffers) {
          if (offer.isActive) {
            const offerDiscount = (discountedPrice * offer.discount) / 100;
            if (offerDiscount > bestOfferDiscount) {
              bestOfferDiscount = offerDiscount;
            }
          }
        }

        discountedPrice -= bestOfferDiscount;
        const offerDiscount = (productPrice - discountedPrice) * quantity;
        subtotal += discountedPrice * quantity;
        totalOfferDiscount += offerDiscount;
      }

      const gst = subtotal * 0.18;
      const shipping = subtotal < 500 ? 40 : 0;
      const total = subtotal + shipping;

      const wallet = await Wallet.findOne({ user: user._id });

      res.render("checkout", {
        user,
        userId,
        cart,
        total,
        gst,
        shipping,
        coupons,
        addresses,
        paymentMethod,
        subtotal,
        totalOfferDiscount,
        totalAmount: total,
        wallet,
      });
    } else {
      res.render("checkout", {
        user,
        userId,
        cart,
        subtotal: 0,
        addresses,
        paymentMethod,
        totalOfferDiscount: 0,
        totalAmount: 0,
      });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_CHECKOUT, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const applyCoupon = async (req, res) => {
  try {
    const code = req.params.couponCode;
    const user = await User.findById(req.session.user);
    const cart = await Cart.findOne({ user: user._id }).populate({
      path: "products.product",
      populate: {
        path: "offers",
        match: { isActive: true },
      },
    });
    const coupon = await Coupon.findOne({ code: code });

    const usedCoupon = await Order.findOne({
      user: user._id,
      "coupon.code": code,
    });

    if (usedCoupon) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.COUPON.ALREADY_USED });
    }

    if (!coupon) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.COUPON.INVALID });
    }

    if (!cart) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.CART.EMPTY });
    }

    let subtotal = 0;
    let totalOfferDiscount = 0;

    for (const item of cart.products) {
      const productPrice = item.product.price || 0;
      const quantity = item.quantity || 0;
      let discountedPrice = productPrice;
      let bestOfferDiscount = 0;

      const productOffers = item.product.offers || [];
      const categoryOffers = await Offer.find({
        item: item.product.category,
        isActive: true,
      });

      const allOffers = [...productOffers, ...categoryOffers];

      for (const offer of allOffers) {
        if (offer.isActive) {
          const offerDiscount = (discountedPrice * offer.discount) / 100;
          if (offerDiscount > bestOfferDiscount) {
            bestOfferDiscount = offerDiscount;
          }
        }
      }

      discountedPrice -= bestOfferDiscount;
      const offerDiscount = (productPrice - discountedPrice) * quantity;
      subtotal += discountedPrice * quantity;
      totalOfferDiscount += offerDiscount;
    }

    const currDate = Date.now();

    if (subtotal < coupon.minPurchase || coupon.validity < currDate) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.COUPON.INVALID });
    }

    const couponDiscountAmount = (subtotal * coupon.discount) / 100;
    const couponDiscount =
      couponDiscountAmount <= coupon.maxAmount
        ? couponDiscountAmount
        : coupon.maxAmount;
    const gst = subtotal * 0.18;
    const totalAmount = subtotal - couponDiscount + (cart.shipping || 0);

    res.status(STATUS.OK).json({
      success: true,
      subtotal: parseFloat(subtotal.toFixed(2)),
      gst: parseFloat(gst.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      couponDiscount: parseFloat(couponDiscount.toFixed(2)),
      couponDescription: coupon.description,
      code,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.APPLY_COUPON, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

module.exports = {
  userHome,
  userAbout,
  userContact,
  toshop,
  toProdDetails,
  toUserProfile,
  toEditProfile,
  editProfile,
  toCheckout,
  applyCoupon,
};
