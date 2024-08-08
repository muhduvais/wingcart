const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    orderId : {
        type: String,
    },
    address: {
      fname: String,
      lname: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
      phone: String
    },
      orderDate: {
        type: Date,
        default: Date.now
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
      },
      coupon: {
        code: String,
        description: String,
        discount: Number,
        minPurchase: Number,
        maxAmount: Number,
        validity: Date,
      },
      products: [{
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'products',
        },
        price: {
            type: Number,
          },
        quantity: {
          type: Number,
        },
        cancellationDate: Date,
        cancellationReason: String,
        returnDate: Date,
        returnReason: String,
        status: String
      }],
      payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paymentmethods',
      },
      offers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offers'
      }],
      totalAmount: {
        type: Number,
      },
      paymentStatus: {
        type: String,
      }
});

const Order = mongoose.model('orders', orderSchema);

module.exports = Order;