const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
});

const Brand = mongoose.model('brands', brandSchema);

module.exports = Brand;