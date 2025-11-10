const User = require("../model/usersModel");
const Wallet = require("../model/walletsModel");
const Razorpay = require("razorpay");
require("dotenv").config();

const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function generateTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 4);
  return `TXN-${timestamp}-${randomPart}`;
}

const toWallet = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ user: user._id });

    if (!wallet || wallet.transactions.length === 0) {
      return res.render("wallet", {
        user,
        wallet: wallet || { transactions: [], balance: 0 },
      });
    }

    wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const paginatedTransactions = wallet.transactions.slice(skip, skip + limit);
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    const walletWithPaginatedTransactions = {
      ...wallet.toObject(),
      transactions: paginatedTransactions,
    };

    const lastTransaction = wallet.transactions[0];

    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.status(STATUS.OK).json({
        success: true,
        transactions: paginatedTransactions,
        currentPage: page,
        totalPages,
        totalTransactions,
      });
    }

    res.render("wallet", {
      user,
      wallet: walletWithPaginatedTransactions,
      lastTransaction,
      currentPage: page,
      totalPages,
      totalTransactions,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_WALLET, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const getWalletTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ user: user._id });

    if (!wallet || wallet.transactions.length === 0) {
      return res.status(STATUS.OK).json({
        success: true,
        transactions: [],
        currentPage: 1,
        totalPages: 1,
        totalTransactions: 0,
      });
    }

    wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const paginatedTransactions = wallet.transactions.slice(skip, skip + limit);
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.status(STATUS.OK).json({
      success: true,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_TRANSACTIONS, err);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const addFund = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const wallet = await Wallet.findOne({ user: user._id });
    const amount = parseFloat(req.params.amount);
    console.log("Wallet amount: ", amount);

    const transactionId = generateTransactionId();

    const transactions = {
      transactionId: transactionId,
      amount: amount,
      date: new Date(),
      type: "credit",
    };

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: transactionId,
      payment_capture: 1,
    });

    return res.status(STATUS.OK).json({
      success: true,
      transactions: transactions,
      razorpayOrderId: razorpayOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
      user: {
        name: user.fname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADD_FUND, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const addFundUpdate = async (req, res) => {
  try {
    const user = await User.findById(req.session.user);
    const wallet = await Wallet.findOne({ user: user._id });
    const { transactions } = req.body;

    wallet.balance += transactions.amount;
    wallet.transactions.push(transactions);
    await wallet.save();

    res.status(STATUS.OK).json({ success: true });
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADD_FUND_UPDATE, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

module.exports = {
  toWallet,
  getWalletTransactions,
  addFund,
  addFundUpdate,
};
