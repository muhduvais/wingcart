const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    products: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
          quantity: { type: Number, default: 1 }
        }
      ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    }
});

const Cart = mongoose.model('cart', cartSchema);

module.exports = Cart;