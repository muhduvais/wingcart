const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    isListed: {
        type: Boolean,
        default: true
    }
});

const Category = mongoose.model('categories', categorySchema);

module.exports = Category;