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
      type: {
        type: String,
      },
      brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brands',
        required: true,
      },
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories',
        required: true,
      },
      offers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offers',
      }],
      stock: {
        type: Number,
        required: true,
      },
      addedDate: {
        type: Date,
        default: Date.now,
      },
      isListed: {
        type: Boolean,
        default: true,
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