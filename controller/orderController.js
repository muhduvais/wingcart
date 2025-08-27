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
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
      return res.json({ message: "Cart is empty" });
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
      console.log("totalProductPrice: ", totalProductPrice);
      console.log("proportion: ", proportion);
      console.log("productDiscount: ", productDiscount);
      console.log("item.finalPrice: ", item.finalPrice);
    }

    if (totalAmount > 1000 && paymentMethod.type === "Cash on delivery") {
      return res.json({
        message:
          "Cash on delivery is applicable only for orders less than Rs. 1000!",
      });
    }

    if (paymentMethod.type === "Wallet") {
      const wallet = await Wallet.findOne({ user: user._id });
      if (wallet.balance < totalAmount) {
        return res.json({ message: "Not enough balance in your wallet!" });
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

    console.log("newOrder: ", newOrder);

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

      console.log("razorpayOrder: ", razorpayOrder);

      await Cart.deleteOne({ user: userId });

      return res.status(200).json({
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

    res.status(200).json({
      success: "Order placed successfully",
      orderId,
      totalDiscountAmount,
      paymentType: paymentMethod.type,
    });
  } catch (err) {
    console.error("Error creating order", err);
    res.status(500).send("Internal server error");
  }
};

const updatePaymentFailure = async (req, res) => {
  try {
    const orderId = req.params.id;
    await Order.findOneAndUpdate({ orderId }, { paymentStatus: "Pending" });

    return res.status(200).json({
      success: true,
      message: "Payment status updated!",
    });
  } catch (err) {
    console.error("Error updating the payment status", err);
    res.status(500).send("Internal server error");
  }
};

const retryPayment = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const orderId = req.body.orderId;
    const order = await Order.findOne({ orderId: orderId });

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

    console.log("order: ", order);

    if (order.coupon !== null) {
      let totalDiscount = (subtotal * order.coupon.discount) / 100;
      totalDiscount = isNaN(totalDiscount) ? 0 : totalDiscount;
      console.log("totalDiscount: ", totalDiscount);
      productsDiscount = totalDiscount * proportion;
    }

    const payableAmount = pendingSubtotal - productsDiscount;

    console.log("subtotal: ", subtotal);
    console.log("pendingSubtotal: ", pendingSubtotal);
    console.log("proportion: ", proportion);
    console.log("productsDiscount: ", productsDiscount);
    console.log("payableAmount: ", payableAmount);

    const razorpayOrder = await razorpay.orders.create({
      amount: parseInt(payableAmount * 100),
      currency: "INR",
      receipt: orderId,
      payment_capture: 1,
    });

    return res.status(200).json({
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
    console.error("Error retrying the payment", err);
    res.status(500).send("Internal server error");
  }
};

const toOrderConf = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const paymentStatus = req.query.payment;
    const isRetry = req.query.retry;
    console.log("paymentStatus: ", paymentStatus);

    const orderId = req.params.order_id;
    const offerDiscount = req.query.discount;
    const order = await Order.findOne({ orderId }).populate("products.product");

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
    if (order.coupon !== null) {
      couponDiscount = (subtotal * order.coupon.discount) / 100;
    }
    couponDiscount =
      couponDiscount <= order.coupon.maxAmount
        ? couponDiscount
        : order.coupon.maxAmount;

    console.log(offerDiscount, couponDiscount);

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
    console.error("Error fetching order confirmation", err);
    res.status(500).send("Internal server error");
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
    console.error("Error fetching order History", err);
    res.status(500).send("Internal server error");
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    await Order.updateOne(
      { orderId: orderId },
      { $set: { paymentStatus: "Completed" } }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error updating payment status!", err);
    res.status(500).send("Internal server error");
  }
};

const toOrderDetails = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const orderId = req.params.order_id;
    const order = await Order.findById(orderId).populate("products.product");

    if (!order || order.user.toString() !== user._id.toString()) {
      return res.status(404).send("Order not found");
    }

    //Checks if there is products which are delivered
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
    // const subtotalBefore = order.products.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const shipping = subtotal < 500 ? 40 : 0;
    const totalAmount = order.totalAmount;
    // const offerDiscount = subtotalBefore - subtotal;
    let couponDiscount = (subtotal * order.coupon.discount) / 100;
    couponDiscount =
      couponDiscount <= order.coupon.maxAmount
        ? couponDiscount
        : order.coupon.maxAmount;

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
    console.error("Error fetching order details", err);
    res.status(500).send("Internal server error");
  }
};

function generateTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 4);
  return `TXN-${timestamp}-${randomPart}`;
}

const cancelProduct = async (req, res) => {
  const { orderId, productId } = req.params;
  const reason = req.body.reason;
  const user = await User.findById(req.session.user);

  try {
    const order = await Order.findById(orderId).populate("payment");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const product = order.products.find(
      (item) => item.product.toString() === productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
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
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const returnProduct = async (req, res) => {
  const user = await User.findById(req.session.user);
  const { orderId, productId } = req.params;
  const reason = req.body.reason;

  try {
    const order = await Order.findById(orderId);
    console.log(order.address);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const product = order.products.find(
      (item) => item.product.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
    }

    product.status = "return requested";
    product.returnReason = reason;

    const updateProduct = await Product.findOne({ _id: productId });

    updateProduct.stock += product.quantity;

    await updateProduct.save();
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate("products.product");
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
    console.log("order.coupon.discount", order.coupon.discount);

    const couponLength = Object.keys(order.coupon).length;
    console.log("couponLength: ", couponLength);

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

    console.log("summary: ", summary);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render(
      "invoiceTemplate",
      { user, order, paymentMethod, products, summary },
      (err, html) => {
        if (err) {
          console.error("Error rendering invoice template:", err);
          return res.status(500).send("Error generating invoice");
        }

        pdf.create(html, {}).toBuffer((err, buffer) => {
          if (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).send("Error generating PDF");
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
    console.error("Error fetching order details:", err);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  createOrder,
  toOrderConf,
  toOrderHistory,
  toOrderDetails,
  downloadInvoice,
  cancelProduct,
  returnProduct,
  retryPayment,
  updatePaymentStatus,
  updatePaymentFailure,
};
