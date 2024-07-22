const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    orderId : {
        type: String,
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'addresses',
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'coupons'
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
});

const Order = mongoose.model('orders', orderSchema);

module.exports = Order;