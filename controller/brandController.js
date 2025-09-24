const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Cart = require("../model/cartModel");
const Order = require("../model/ordersModel");
const Coupon = require("../model/couponsModel");
const Offer = require("../model/offersModel");
const Wallet = require("../model/walletsModel");
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
const ITEMS_PER_PAGE = 5;
const path = require("path");

const toBrandList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const brands = await Brand.find({}).skip(skip).limit(ITEMS_PER_PAGE);

    const totalBrands = await Brand.countDocuments({});

    const totalPages = Math.ceil(totalBrands / ITEMS_PER_PAGE);

    res.render("brandList", {
      brands: brands,
      pagination: {
        currentPage: page,
        pages: totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).send("Internal Server Error");
  }
};

const toAddBrand = (req, res) => {
  res.render("addBrand");
};

const verifyAddBrand = async (req, res) => {
  try {
    const { brandName, brandDesc } = req.body;
    const regName = new RegExp(brandName, "i");
    console.log(regName);
    const isPresentBrand = await Brand.findOne({ name: { $regex: regName } });

    if (!isPresentBrand) {
      const brand = new Brand({
        name: brandName,
        description: brandDesc,
      });

      await brand.save();
      console.log("Brand saved");
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ message: "Brand already exists!" });
    }
  } catch (err) {
    console.error("Error adding brand", err);
    res.status(500).send("Internal server error");
  }
};

const toEditBrand = async (req, res) => {
  try {
    const brandId = req.params.brand_id;
    const brand = await Brand.findOne({ _id: brandId });
    res.render("editBrand", { brand, brandId });
  } catch (err) {
    console.error("Error fetching edit brand:", err);
    res.status(500).send("Internal Server Error");
  }
};

const verifyEditBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    const regName = new RegExp(name, "i");
    console.log(req.params.brand_id);
    const existingBrand = await Brand.findOne({
      name: { $regex: regName },
      _id: { $ne: req.params.brand_id },
    });

    if (existingBrand) {
      return res.status(200).json({ message: "Brand already exists!" });
    }

    await Brand.updateOne(
      { _id: req.params.brand_id },
      { $set: { name, description } }
    );

    console.log("Brand updated");
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error editing brand!", err);
    res.status(500).send("Internal Server Error");
  }
};

const processImage = async (file, width, height) => {
  try {
    const outputPath = path.join(
      __dirname,
      "../assets2/img",
      `cropped-${file.filename}`
    );
    await sharp(file.path).toFile(outputPath);
    return `cropped-${file.filename}`;
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).send("Internal Server Error");
  }
};

const toEditProduct = async (req, res) => {
  try {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    const productId = req.params.product_id;
    const product = await Product.findOne({ _id: productId });
    res.render("editProduct", { product, categories, brands, productId });
  } catch (err) {
    console.error("Error fetching edit product:", err);
    res.status(500).send("Internal Server Error");
  }
};

const brandListToggle = async (req, res) => {
  try {
    const { brandId, isListed } = req.body;
    console.log(brandId, isListed);
    if (isListed === true) {
      await Brand.updateOne({ _id: brandId }, { $set: { isListed: false } });
      res.status(200).json({ message: "Brand Unlisted" });
    } else {
      await Brand.updateOne({ _id: brandId }, { $set: { isListed: true } });
      res.status(200).json({ message: "Brand Listed" });
    }
  } catch (err) {
    console.error("Error on brand list toggle:", err);
    res.status(500).send("Internal Server Error");
  }
};

function generateTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 4);
  return `TXN-${timestamp}-${randomPart}`;
}

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

module.exports = {
  toBrandList,
  toAddBrand,
  verifyAddBrand,
  toEditBrand,
  verifyEditBrand,
  brandListToggle,
};
