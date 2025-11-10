const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Order = require("../model/ordersModel");
const Offer = require("../model/offersModel");
const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const generatePDF = (reportData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    doc.text("Sales Report", { align: "center", underline: true });

    doc.moveDown();
    doc.text(`Total Orders: ${reportData.totalOrders}`);
    doc.text(`Total Sales Amount: ${reportData.totalSales}`);
    doc.text(`Total Discounts: ${reportData.totalDiscounts}`);
    doc.moveDown();

    reportData.orders.forEach((order) => {
      doc.text(`Order ID: ${order.orderId}`);
      doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`);
      doc.text(`Total Amount: ${order.totalAmount}`);
      doc.text(`Discount: ${order.discountAmount}`);
      doc.text("Products:");
      order.products.forEach((product) => {
        doc.text(
          `- ${product.productName}: ${product.quantity} x ${product.price}`
        );
      });
      doc.moveDown();
    });

    doc.end();
  });
};

const generateExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Report");

  sheet.columns = [
    { header: "Order ID", key: "orderId", width: 20 },
    { header: "Order Date", key: "orderDate", width: 20 },
    { header: "Total Amount", key: "totalAmount", width: 15 },
    { header: "Discount Amount", key: "discountAmount", width: 15 },
    { header: "Product Name", key: "productName", width: 30 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Price", key: "price", width: 15 },
  ];

  reportData.orders.forEach((order) => {
    order.products.forEach((product) => {
      sheet.addRow({
        orderId: order.orderId,
        orderDate: new Date(order.orderDate).toLocaleDateString(),
        totalAmount: order.totalAmount,
        discountAmount: isNaN(order.discountAmount) ? 0 : order.discountAmount,
        productName: product.productName,
        quantity: product.quantity,
        price: product.price,
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../assets2/img"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const toCreateOffer = async (req, res) => {
  try {
    const products = await Product.find().select("_id name");
    res.render("createOffer", { products });
  } catch (error) {
    console.error(MESSAGES.ERRORS.FETCH_CREATE_OFFER, error);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toCreateCategoryOffer = async (req, res) => {
  try {
    const categories = await Category.find().select("_id name");
    res.render("createCategoryOffer", { categories });
  } catch (error) {
    console.error(MESSAGES.ERRORS.FETCH_CREATE_CATEGORY_OFFER, error);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const verifyProductOffer = async (req, res) => {
  try {
    const { name, discount, item } = req.body;

    const type = "products";

    const offer = new Offer({
      name,
      discount,
      type,
      item,
    });

    await offer.save();

    await Product.updateMany(
      { _id: item },
      { $addToSet: { offers: offer._id } }
    );

    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.CREATE_OFFER, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const verifyCategoryOffer = async (req, res) => {
  try {
    const { name, discount, item } = req.body;

    const type = "categories";

    const offer = new Offer({
      name,
      discount,
      type,
      item,
    });

    await offer.save();

    await Product.updateMany(
      { category: item },
      { $addToSet: { offers: offer._id } }
    );

    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.CREATE_CATEGORY_OFFER, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const toggleOfferStatus = async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { isActive } = req.body;

    console.log("offerId: ", offer_id, "isActive: ", isActive);

    const offer = await Offer.findById(offer_id);
    if (!offer) {
      console.warn(MESSAGES.ERRORS.TOGGLE_OFFER_NOT_FOUND, offer_id);
      return res
        .status(STATUS.NOT_FOUND)
        .json({ success: false, message: MESSAGES.OFFER.NOT_FOUND });
    }

    offer.isActive = isActive;
    await offer.save();

    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.TOGGLE_OFFER_ERROR, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

const generateReportData = async (reportType, startDate, endDate) => {
  let filter = {};
  const currentDate = new Date();

  switch (reportType) {
    case "daily":
      filter.orderDate = {
        $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
        $lte: new Date(currentDate.setHours(23, 59, 59, 999)),
      };
      break;
    case "weekly":
      const weekStartDate = new Date(
        currentDate.setDate(currentDate.getDate() - currentDate.getDay())
      );
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 999);
      filter.orderDate = { $gte: weekStartDate, $lte: weekEndDate };
      break;
    case "monthly":
      const monthStartDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const monthEndDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );
      monthEndDate.setHours(23, 59, 59, 999);
      filter.orderDate = { $gte: monthStartDate, $lte: monthEndDate };
      break;
    case "custom":
      if (startDate && endDate) {
        filter.orderDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      break;
  }

  const orders = await Order.find(filter).populate("products.product");

  const report = orders.map((order) => {
    const discountAmount = order.coupon
      ? (order.totalAmount * order.coupon.discount) / 100
      : 0;
    return {
      orderId: order.orderId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      discountAmount: isNaN(discountAmount) ? 0 : discountAmount,
      products: order.products.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  });

  const totalDiscounts = report.reduce(
    (acc, order) => acc + order.discountAmount,
    0
  );

  return {
    totalOrders: orders.length,
    totalSales: orders.reduce((acc, order) => acc + order.totalAmount, 0),
    totalDiscounts: totalDiscounts,
    orders: report,
  };
};

const verifyEditOffer = async (req, res) => {
  try {
    const { offerName, discount, type, items } = req.body;
    const offerId = req.params.offer_id;
    await Offer.findByIdAndUpdate(offerId, {
      name: offerName,
      discount: discount,
      type: type,
      item: items,
    });

    res.status(STATUS.OK).json({ success: true });
  } catch (error) {
    console.error(MESSAGES.ERRORS.EDIT_OFFER, error);
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

module.exports = {
  toCreateOffer,
  toCreateCategoryOffer,
  verifyProductOffer,
  verifyCategoryOffer,
  toggleOfferStatus,
  verifyEditOffer,
};
