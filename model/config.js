const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: {
        type: String
    },
    lname: {
        type: String
    },
    age: {
        type: Number
    },
    phone: {
        type: Number
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    },
    googleId: {
        type: String
    }
});

const User = mongoose.model('users', userSchema);

module.exports = User;