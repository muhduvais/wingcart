const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
    name: {
        type: String
    },
    discount: {
        type: Number
    },
    type: {
        type: String
    },
    item: [{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'type'
    }],
    isActive: {
        type: Boolean,
        default: true
    }

});

const Offer = mongoose.model('offers', offerSchema);

module.exports = Offer;