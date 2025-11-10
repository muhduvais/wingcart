const User = require("../model/usersModel");
const Address = require("../model/addressesModel");
const { MESSAGES  } = require("../constants/messages");
const { STATUS } = require("../enums/statusCodes");
require("dotenv").config();

const toAddr = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const addresses = await Address.find({ user: userId });
    console.log(addresses);
    res.render("userAddresses", { user, userId, addresses });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_ADDRESSES, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toAddAddr = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    res.render("userAddAddress", { user, userId });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_ADD_ADDRESS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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

    res.status(STATUS.CREATED).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADD_ADDRESS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.address_id;
    await Address.findByIdAndDelete(addressId);
    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.DELETE_ADDRESS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
    console.error(MESSAGES.ERRORS.FETCH_EDIT_ADDRESS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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

    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.EDIT_ADDRESS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
