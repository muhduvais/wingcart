const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    discount: {
        type: double
    },
    validity: {
        type: date
    }
});

const Offer = mongoose.model('offers', offerSchema);

module.exports = Offer;