const User = require("../model/usersModel");
const Product = require("../model/productsModel");
const Address = require("../model/addressesModel");
const Cart = require("../model/cartModel");
const Payment = require("../model/paymentModel");
const Order = require("../model/ordersModel");
const Coupon = require("../model/couponsModel");
const Offer = require("../model/offersModel");
const Wallet = require("../model/walletsModel");
const Razorpay = require("razorpay");
const pdf = require("html-pdf");
const puppeteer = require("puppeteer");
require("dotenv").config();

const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateOrderId = () => {
  const date = new Date();
  const components = [
    date.getFullYear(),
    ("0" + (date.getMonth() + 1)).slice(-2),
    ("0" + date.getDate()).slice(-2),
    ("0" + date.getHours()).slice(-2),
    ("0" + date.getMinutes()).slice(-2),
    ("0" + date.getSeconds()).slice(-2),
  ];

  const dateString = components.join("");
  const randomNumber = Math.floor(Math.random() * 10000);

  return `ORD-${dateString}-${randomNumber}`;
};

function generateTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 4);
  return `TXN-${timestamp}-${randomPart}`;
}

const updateProductQuantities = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate("products.product");

    if (!order) {
      throw new Error(MESSAGES.ORDER.ORDER_NOT_FOUND);
    }

    for (const item of order.products) {
      const productId = item.product._id;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId);

      if (product) {
        product.stock -= orderedQuantity;
        if (product.stock < 0) {
          product.stock = 0;
        }

        await product.save();
      }
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.UPDATE_PRODUCT_QUANTITIES_ERROR, err);
  }
};

const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethodId, couponCode } = req.body;

    const paymentMethod = await Payment.findById(paymentMethodId);
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "products.product",
      populate: {
        path: "offers",
      },
    });
    const orderId = generateOrderId();
    const address = await Address.findById(addressId);

    if (!cart) {
      return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.ORDER.CART_EMPTY });
    }

    const orderProducts = [];
    const appliedOffers = new Set();
    let subtotal = 0;
    let totalDiscountAmount = 0;
    let discountedPrice = 0;

    /////////////////

    /////////////////

    let couponDiscount = 0;
    let coupon = null;

    for (const item of cart.products) {
      const product = item.product;
      const quantity = item.quantity;
      const productPrice = product.price || 0;

      discountedPrice = productPrice;
      let bestOfferDiscount = 0;
      let bestOfferId = null;

      const productOffers = product.offers || [];
      const categoryOffers = await Offer.find({
        item: product.category,
        isActive: true,
      });

      const allOffers = [...productOffers, ...categoryOffers];

      for (const offer of allOffers) {
        if (offer.isActive) {
          const offerDiscount = (discountedPrice * offer.discount) / 100;
          if (offerDiscount > bestOfferDiscount) {
            bestOfferDiscount = offerDiscount;
            bestOfferId = offer._id;
          }
        }
      }

      discountedPrice -= bestOfferDiscount;

      orderProducts.push({
        product: product._id,
        quantity,
        price: discountedPrice,
        finalPrice: 0,
        status: "pending",
        cancellationDate: null,
        cancellationReason: null,
        returnDate: null,
        returnReason: null,
      });

      subtotal += discountedPrice * quantity;

      if (bestOfferId) {
        appliedOffers.add(bestOfferId);
        totalDiscountAmount += bestOfferDiscount * quantity;
      }
    }

    //Coupon-check
    if (couponCode) {
      const couponDoc = await Coupon.findOne({ code: couponCode });
      if (couponDoc) {
        coupon = {
          code: couponDoc.code,
          discount: couponDoc.discount,
          description: couponDoc.description,
          minPurchase: couponDoc.minPurchase,
          maxAmount: couponDoc.maxAmount,
          validity: couponDoc.validity,
        };
        couponDiscount = (subtotal * coupon.discount) / 100;
        couponDiscount =
          couponDiscount <= coupon.maxAmount
            ? couponDiscount
            : coupon.maxAmount;
      }
    }

    const subtotalBeforeCouponDiscount = subtotal;

    const gst = subtotal * 0.18;
    subtotal -= couponDiscount;
    const shipping = subtotal < 500 ? 40 : 0;
    let totalAmount = subtotal + shipping;

    //Add the final price to all products
    for (const item of orderProducts) {
      const totalProductPrice = item.price * item.quantity;
      const proportion = totalProductPrice / subtotalBeforeCouponDiscount;
      const productDiscount = couponDiscount * proportion;
      item.finalPrice = parseFloat(item.price - productDiscount.toFixed(2));
    }

    if (totalAmount > 1000 && paymentMethod.type === "Cash on delivery") {
      return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.ORDER.COD_NOT_ALLOWED });
    }

    if (paymentMethod.type === "Wallet") {
      const wallet = await Wallet.findOne({ user: user._id });
      if (!wallet || wallet.balance < totalAmount) {
        return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.ORDER.WALLET_INSUFFICIENT });
      }

      const transactionId = generateTransactionId();

      const transactions = {
        transactionId: transactionId,
        amount: totalAmount,
        date: new Date(),
        type: "debit",
      };

      wallet.balance -= totalAmount;
      wallet.transactions.push(transactions);
      await wallet.save();
    }

    let paymentStatus = "Completed";

    if (paymentMethod.type === "Cash on delivery") {
      paymentStatus = "Pending";
    }

    const newOrder = new Order({
      orderId: orderId,
      user: user._id,
      address: {
        fname: address.fname,
        lname: address.lname,
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        phone: address.phone,
      },
      orderDate: new Date(),
      coupon,
      products: orderProducts,
      payment: paymentMethodId,
      offers: Array.from(appliedOffers),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      gst: parseFloat(gst.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
      paymentStatus,
    });

    await newOrder.save();
    const createdOrder = await Order.findOne({ orderId });

    updateProductQuantities(createdOrder._id);

    if (paymentMethod.type === "Razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: parseInt(totalAmount * 100),
        currency: "INR",
        receipt: orderId,
        payment_capture: 1,
      });

      await Cart.deleteOne({ user: userId });

      return res.status(STATUS.OK).json({
        success: true,
        totalAmount: parseInt(totalAmount * 100),
        paymentMethod: paymentMethod.type,
        orderId: orderId,
        totalDiscountAmount,
        razorpayOrderId: razorpayOrder.id,
        key: process.env.RAZORPAY_KEY_ID,
        user: {
          name: user.fname,
          email: user.email,
          phone: user.phone,
        },
      });
    }

    return res.status(STATUS.OK).json({
      success: true,
      message: MESSAGES.ORDER.ORDER_PLACED,
      orderId,
      totalDiscountAmount,
      paymentType: paymentMethod.type,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ORDER_CREATE_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const updatePaymentFailure = async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findOneAndUpdate({ orderId }, { paymentStatus: "Pending" });

    return res.status(STATUS.OK).json({
      success: true,
      message: MESSAGES.ORDER.PAYMENT_STATUS_UPDATED,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.UPDATE_PAYMENT_FAILURE_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const retryPayment = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const orderId = req.body.orderId;
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.ORDER_NOT_FOUND });
    }

    const subtotal = order.products.reduce((acc, item) => {
      return (acc += item.price * item.quantity);
    }, 0);

    const pendingSubtotal = order.products.reduce((acc, item) => {
      if (item.status !== "cancelled") {
        acc += item.price * item.quantity;
      }
      return acc;
    }, 0);

    const proportion = pendingSubtotal / subtotal;
    let productsDiscount = 0;

    if (order.coupon !== null) {
      let totalDiscount = (subtotal * order.coupon.discount) / 100;
      totalDiscount = isNaN(totalDiscount) ? 0 : totalDiscount;
      productsDiscount = totalDiscount * proportion;
    }

    const payableAmount = pendingSubtotal - productsDiscount;

    const razorpayOrder = await razorpay.orders.create({
      amount: parseInt(payableAmount * 100),
      currency: "INR",
      receipt: orderId,
      payment_capture: 1,
    });

    return res.status(STATUS.OK).json({
      success: true,
      totalAmount: parseInt(payableAmount * 100),
      orderId: orderId,
      razorpayOrderId: razorpayOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
      user: {
        name: user.fname,
        email: user.email,
        phone: user.phone,
      },
      address: order.address,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.RETRY_PAYMENT_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toOrderConf = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const paymentStatus = req.query.payment;
    const isRetry = req.query.retry;

    const orderId = req.params.order_id;
    const offerDiscount = req.query.discount;
    const order = await Order.findOne({ orderId }).populate("products.product");

    if (!order) {
      return res.status(STATUS.NOT_FOUND).send(MESSAGES.ORDER.ORDER_NOT_FOUND);
    }

    if (isRetry === "true") {
      if (paymentStatus && paymentStatus === "success") {
        order.paymentStatus = "Completed";
        await order.save();
      } else {
        order.paymentStatus = "Pending";
        await order.save();
      }
    }

    const orderDate = new Date(order.orderDate);
    const expectedDeliveryDate = new Date(orderDate);
    expectedDeliveryDate.setDate(orderDate.getDate() + 3);

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const deliveryDay = days[expectedDeliveryDate.getDay()];

    const subtotal = order.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const gst = subtotal * 0.18;
    const shippingCharge = subtotal < 500 ? 40 : 0;
    let totalAmount = subtotal + shippingCharge;
    let couponDiscount = 0;
    if (order.coupon !== null && order.coupon.discount) {
      couponDiscount = (subtotal * order.coupon.discount) / 100;
    }
    couponDiscount =
      couponDiscount <= (order.coupon?.maxAmount || 0)
        ? couponDiscount
        : order.coupon.maxAmount || 0;

    const discount2 = isNaN(couponDiscount) ? 0 : parseFloat(couponDiscount);

    totalAmount -= discount2;

    res.render("orderConfirmation", {
      user,
      order,
      deliveryDay,
      subtotal,
      subtotal,
      gst,
      shippingCharge,
      totalAmount,
      couponDiscount,
      paymentStatus,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ORDER_CONFIRM_FETCH_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toOrderHistory = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ user: user._id });

    const orders = await Order.find({ user: user._id })
      .populate("products")
      .populate("payment")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);

    orders.forEach((order) => {
      const isAllCancelled = order.products.reduce((allCancelled, product) => {
        return allCancelled && product.status === "cancelled";
      }, true);
      order.isAllCancelled = isAllCancelled;
    });

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orderHistory", {
      user,
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      limit,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ORDER_HISTORY_FETCH_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    await Order.updateOne(
      { orderId: orderId },
      { $set: { paymentStatus: "Completed" } }
    );

    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.UPDATE_PAYMENT_STATUS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toAdminOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.order_id;

    const order = await Order.findById(orderId)
      .populate("products.product")
      .populate("payment");

    const subtotal = order.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const gst = subtotal * 0.18;
    const subtotalBefore = order.products.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const shipping = subtotal < 500 ? 40 : 0;
    const totalAmount = order.totalAmount;
    const offerDiscount = subtotalBefore - subtotal;
    const couponDiscount = (subtotal * order.coupon.discount) / 100;
    const totalDiscount = offerDiscount + couponDiscount;

    res.render("adminOrderDetails", {
      order,
      subtotal,
      gst,
      shipping,
      totalAmount,
      subtotalBefore,
      totalDiscount,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADMIN_ORDER_DETAILS_FETCH_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toOrderDetails = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const orderId = req.params.order_id;
    const order = await Order.findById(orderId).populate("products.product");

    if (!order || order.user.toString() !== user._id.toString()) {
      return res.status(STATUS.NOT_FOUND).send(MESSAGES.ORDER.ORDER_NOT_FOUND);
    }

    const hasDeliveredProduct = order.products.some((product) =>
      ["delivered", "return requested", "return rejected"].includes(
        product.status
      )
    );

    const subtotal = order.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const gst = subtotal * 0.18;
    const shipping = subtotal < 500 ? 40 : 0;
    const totalAmount = order.totalAmount;
    let couponDiscount = 0;
    if (order.coupon && order.coupon.discount) {
      couponDiscount = (subtotal * order.coupon.discount) / 100;
    }
    couponDiscount =
      couponDiscount <= (order.coupon?.maxAmount || 0)
        ? couponDiscount
        : order.coupon.maxAmount || 0;

    res.render("orderDetails", {
      user,
      order,
      subtotal,
      couponDiscount,
      gst,
      shipping,
      totalAmount,
      hasDeliveredProduct,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ORDER_DETAILS_FETCH_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const cancelProduct = async (req, res) => {
  const { orderId, productId } = req.params;
  const reason = req.body.reason;
  const user = await User.findById(req.session.user);

  try {
    const order = await Order.findById(orderId).populate("payment");
    if (!order) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.ORDER_NOT_FOUND });
    }

    const product = order.products.find(
      (item) => item.product.toString() === productId
    );

    if (!product) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.PRODUCT_NOT_IN_ORDER });
    }

    const productCancelPrice = product.finalPrice * product.quantity;

    product.cancellationDate = Date.now();
    product.cancellationReason = reason;

    if (
      order.payment.type !== "Cash on delivery" &&
      order.paymentStatus !== "Pending"
    ) {
      let wallet = await Wallet.findOne({ user: user._id });

      if (!wallet) {
        const newWallet = new Wallet({
          user: user._id,
          balance: 0,
          transactions: [],
        });

        await newWallet.save();

        wallet = await Wallet.findOne({ user: user._id });
      }

      const transactionId = generateTransactionId();

      const transactions = {
        amount: productCancelPrice,
        date: new Date(),
        type: "credit",
        transactionId: transactionId,
      };

      wallet.balance += productCancelPrice;
      wallet.transactions.push(transactions);

      await wallet.save();
    }

    product.status = "cancelled";

    const updateProduct = await Product.findOne({ _id: productId });

    updateProduct.stock += product.quantity;

    await updateProduct.save();
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.CANCEL_PRODUCT_ERROR, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const returnProduct = async (req, res) => {
  const user = await User.findById(req.session.user);
  const { orderId, productId } = req.params;
  const reason = req.body.reason;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.ORDER_NOT_FOUND });
    }

    const product = order.products.find(
      (item) => item.product.toString() === productId
    );
    if (!product) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.PRODUCT_NOT_IN_ORDER });
    }

    product.status = "return requested";
    product.returnReason = reason;

    const updateProduct = await Product.findOne({ _id: productId });

    updateProduct.stock += product.quantity;

    await updateProduct.save();
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.RETURN_PRODUCT_ERROR, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate("products.product");
    if (!order) {
      return res.status(STATUS.NOT_FOUND).send(MESSAGES.ORDER.ORDER_NOT_FOUND);
    }

    const paymentMethod = await Payment.findById(order.payment);
    const products = order.products.filter((item) =>
      ["delivered", "return requested", "return rejected"].includes(item.status)
    );

    let discount = 0;

    const subtotal = order.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const gst = subtotal * 0.18;
    const shipping = subtotal < 500 ? 40 : 0;

    const couponLength = Object.keys(order.coupon || {}).length;

    let totalAmount = products.reduce((acc, item) => {
      return (acc += item.price * item.quantity);
    }, 0);

    if (couponLength > 0) {
      const couponDiscount = products.reduce((acc, item) => {
        return (acc += item.price - item.finalPrice);
      }, 0);
      discount = Math.round(couponDiscount);
      totalAmount -= discount;
    }

    const summary = {
      subtotal: subtotal,
      gst: gst,
      shipping: shipping,
      totalAmount: totalAmount,
      discount: discount,
    };

    res.render(
      "invoiceTemplate",
      { user, order, paymentMethod, products, summary },
      (err, html) => {
        if (err) {
          console.error(MESSAGES.ERRORS.DOWNLOAD_INVOICE_ERROR, err);
          return res.status(STATUS.SERVER_ERROR).send(MESSAGES.ORDER.INVOICE_GENERATION_ERROR);
        }

        pdf.create(html, {}).toBuffer((err, buffer) => {
          if (err) {
            console.error(MESSAGES.ERRORS.DOWNLOAD_INVOICE_ERROR, err);
            return res.status(STATUS.SERVER_ERROR).send(MESSAGES.ORDER.INVOICE_GENERATION_ERROR);
          }

          res.setHeader(
            "Content-Disposition",
            "attachment; filename=invoice.pdf"
          );
          res.setHeader("Content-Type", "application/pdf");
          res.send(buffer);
        });
      }
    );
  } catch (err) {
    console.error(MESSAGES.ERRORS.DOWNLOAD_INVOICE_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toOrderManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const skip = (page - 1) * 10;
    const query = {
      $or: [
        { orderId: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } },
      ],
    };

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate("user")
      .populate("payment")
      .skip(skip)
      .limit(10);

    orders.forEach((order) => {
      const pendingOrder = order.products.filter((item) =>
        ["pending", "dispatched", "return requested"].includes(item.status)
      );

      if (pendingOrder.length > 0) {
        order.status = "Pending";
      } else {
        order.status = "Completed";
      }
    });

    const totalOrders = await Order.countDocuments(query);

    const totalPages = Math.ceil(totalOrders / 10);

    res.render("adminOrderManagement", {
      orders,
      totalOrders,
      pagination: {
        currentPage: page,
        pages: totalPages,
      },
      search: search,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ORDER_MANAGEMENT_FETCH_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId).populate("payment");

    if (!order) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.ORDER_NOT_FOUND });
    }

    const product = order.products.find(
      (item) => item.product.toString() === productId
    );

    if (!product) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.ORDER.PRODUCT_NOT_IN_ORDER });
    }

    const user = await User.findOne({ _id: order.user });

    //Wallet update
    if (status === "accept") {
      const productPurchasePrice = product.price;
      const totalProductPrice = productPurchasePrice * product.quantity;

      let wallet = await Wallet.findOne({ user: user._id });

      if (!wallet) {
        const newWallet = new Wallet({
          user: user._id,
          balance: 0,
          transactions: [],
        });

        await newWallet.save();

        wallet = await Wallet.findOne({ user: user._id });
      }

      const transactionId = generateTransactionId();

      const transactions = {
        amount: totalProductPrice.toFixed(2),
        date: new Date(),
        type: "credit",
        transactionId: transactionId,
      };

      wallet.balance += totalProductPrice;
      wallet.transactions.push(transactions);

      await wallet.save();
    }
    //////////

    const statusOrder = ["pending", "dispatched", "delivered"];
    const returnRequestStatus = ["accept", "reject"];

    if (statusOrder.includes(product.status)) {
      if (statusOrder.indexOf(status) > statusOrder.indexOf(product.status)) {
        product.status = status;
        if (order.payment.type === "Cash on delivery") {
          const notDelivered = order.products.filter((item) =>
            ["pending", "dispatched"].includes(item.status)
          );

          if (notDelivered.length === 0) {
            order.paymentStatus = "Completed";
          }
        }
        await order.save();
        return res.json({ success: true });
      }
    } else if (
      product.status === "return requested" &&
      returnRequestStatus.includes(status)
    ) {
      if (status === "accept") {
        product.status = "return accepted";
        product.returnDate = new Date();
      } else if (status === "reject") {
        product.status = "return rejected";
      } else {
        product.status = status;
      }

      await order.save();
      return res.json({ success: true });
    }

    res.json({ success: false });
  } catch (err) {
    console.error(MESSAGES.ERRORS.UPDATE_ORDER_STATUS_ERROR, err);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

module.exports = {
  createOrder,
  toOrderConf,
  toOrderHistory,
  toAdminOrderDetails,
  toOrderDetails,
  downloadInvoice,
  cancelProduct,
  returnProduct,
  retryPayment,
  updatePaymentStatus,
  updatePaymentFailure,
  toOrderManagement,
  updateOrderStatus,
};
