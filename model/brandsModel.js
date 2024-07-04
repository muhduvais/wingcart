const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
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

const Brand = mongoose.model('brands', brandSchema);

module.exports = Brand;