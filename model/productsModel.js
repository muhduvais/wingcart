const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      images: {
        type: [String],
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
      },
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
      offers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
      }],
      stock: {
        type: Number,
        required: true,
      },
      addedDate: {
        type: Date,
        default: Date.now,
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      strapType: {
        type: String,
        required: true,
      },
      model: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: true,
      }
});

const Product = mongoose.model('products', productSchema);

module.exports = Product;