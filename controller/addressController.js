const User = require("../model/usersModel");
const Address = require("../model/addressesModel");
require("dotenv").config();

const toAddr = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const addresses = await Address.find({ user: userId });
    console.log(addresses);
    res.render("userAddresses", { user, userId, addresses });
  } catch (err) {
    console.error("Error fetching addresses", err);
    res.status(500).send("Internal server error");
  }
};

const toAddAddr = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("userAddAddress", { user, userId });
  } catch (err) {
    console.error("Error fetching add address", err);
    res.status(500).send("Internal server error");
  }
};

const verifyAddAddr = async (req, res) => {
  try {
    const userId = req.session.user;
    const { fname, lname, country, city, state, pincode, phone } = req.body;

    const newAddress = new Address({
      fname,
      lname,
      country,
      city,
      state,
      pincode,
      phone,
      user: userId,
    });

    await newAddress.save();

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error adding the address", err);
    res.status(500).send("Internal server error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.address_id;
    await Address.findByIdAndDelete(addressId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error deleting address", err);
    res.status(500).send("Internal server error");
  }
};

const toEditAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.address_id;
    const address = await Address.findById(addressId);
    const user = await User.findById(userId);
    res.render("userEditAddress", { user, userId, address });
  } catch (err) {
    console.error("Error fetching edit address", err);
    res.status(500).send("Internal server error");
  }
};

const verifyEditAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.address_id;
    const { fname, lname, country, city, state, pincode, phone } = req.body;

    await Address.findByIdAndUpdate(addressId, {
      fname,
      lname,
      country,
      city,
      state,
      pincode,
      phone,
      user: userId,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error editing the address", err);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  toAddr,
  toAddAddr,
  verifyAddAddr,
  deleteAddress,
  toEditAddress,
  verifyEditAddress,
};
