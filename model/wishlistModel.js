const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    products: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
        }
      ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    }
});

const Wishlist = mongoose.model('wishlist', wishlistSchema);

module.exports = Wishlist;