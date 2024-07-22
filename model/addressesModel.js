const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    fname: {
        type: String
    },
    lname: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    country: {
        type: String
    },
    phone: {
        type: Number
    },
    pincode: {
        type: Number
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    }
});

const Address = mongoose.model('addresses', addressSchema);

module.exports = Address;