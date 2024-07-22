const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  type: {
    type: String,
  },
  details: {
    cardNumber: String,
    expiryDate: String,
  },
});

const Payment = mongoose.model('paymentmethods', paymentSchema);

module.exports = Payment;