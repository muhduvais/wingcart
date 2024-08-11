const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  balance: {
    type: Number,
  },
  transactions: [{
      amount: {
          type: Number,
      },
      date: {
          type: Date,
      },
      transactionId: {
          type: String,
      },
      type: {
          type: String,
          enum: ['credit', 'debit'],
      }
  }]
});

const Wallet = mongoose.model('wallets', walletSchema);

module.exports = Wallet;