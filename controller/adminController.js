const User = require("../model/usersModel");
const Order = require("../model/ordersModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

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

//

const toAdminDash = async (req, res) => {
  try {
    const admin = req.session.admin;
    const users = await User.find();

    // Delivered, Returned, and Cancelled Counts
    const deliveredCount = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.status": {
            $in: ["delivered", "return requested", "return rejected"],
          },
        },
      },
      { $count: "deliveredCount" },
    ]);

    const returnedCount = await Order.aggregate([
      { $unwind: "$products" },
      { $match: { "products.status": "return accepted" } },
      { $count: "returnedCount" },
    ]);

    const cancelledCount = await Order.aggregate([
      { $unwind: "$products" },
      { $match: { "products.status": "cancelled" } },
      { $count: "cancelledCount" },
    ]);

    const delivered = deliveredCount[0] ? deliveredCount[0].deliveredCount : 0;
    const returned = returnedCount[0] ? returnedCount[0].returnedCount : 0;
    const cancelled = cancelledCount[0] ? cancelledCount[0].cancelledCount : 0;

    const weeklyOrders = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          orderDate: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
          "products.status": { $in: ["delivered", "return rejected"] },
        },
      },
      { $count: "weeklyCount" },
    ]);

    const monthlyOrders = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          orderDate: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
          "products.status": "delivered",
        },
      },
      { $count: "monthlyCount" },
    ]);

    const yearlyOrders = await Order.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          orderDate: {
            $gte: new Date(
              new Date().setFullYear(new Date().getFullYear() - 1)
            ),
          },
          "products.status": { $in: ["delivered", "return rejected"] },
        },
      },
      { $count: "yearlyCount" },
    ]);

    const weekly = weeklyOrders[0] ? weeklyOrders[0].weeklyCount : 0;
    const monthly = monthlyOrders[0] ? monthlyOrders[0].monthlyCount : 0;
    const yearly = yearlyOrders[0] ? yearlyOrders[0].yearlyCount : 0;

    // Top 10 Products
    const topProducts = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          productName: "$productDetails.name",
          totalQuantity: 1,
        },
      },
    ]);

    // Top 10 Categories
    const topCategories = await Order.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          _id: 0,
          categoryName: "$categoryDetails.name",
          totalQuantity: 1,
        },
      },
    ]);

    // Top 10 Brands
    const topBrands = await Order.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.brand",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: "$brandDetails" },
      {
        $project: {
          _id: 0,
          brandName: "$brandDetails.name",
          totalQuantity: 1,
        },
      },
    ]);

    res.render("adminDash", {
      admin,
      users,
      delivered,
      returned,
      cancelled,
      weekly,
      monthly,
      yearly,
      topProducts,
      topCategories,
      topBrands,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_ADMIN_DASH, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const loginHome = (req, res) => {
  if (req.session.admin) {
    res.redirect("/admin/dashboard");
  } else {
    res.render("adminLogin");
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email });

    if (!admin || password !== admin.password) {
      res.status(STATUS.OK).json({ message: MESSAGES.AUTH.INVALID_CREDENTIALS });
    } else {
      req.session.admin = admin;
      res.status(STATUS.OK).json({ success: true });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADMIN_LOGIN_ERROR, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const adminLogout = (req, res) => {
  delete req.session.admin;
  res.render("adminLogin", { logoutMsg: MESSAGES.AUTH.LOGOUT_SUCCESS });
};

//////////////////////////////////
const ITEMS_PER_PAGE = 5;

const toUserMgmt = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const query = {
      email: { $ne: "uadmin@gmail.com" },
      $or: [
        { fname: { $regex: search, $options: "i" } },
        { lname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const users = await User.find(query).skip(skip).limit(ITEMS_PER_PAGE);

    const totalUsers = await User.countDocuments(query);

    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

    res.render("userManagement", {
      users: users,
      pagination: {
        currentPage: page,
        pages: totalPages,
      },
      search: search,
    });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_USERS, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

//////////////////////////////////

const userBlockToggle = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    console.log(userId, isBlocked);
    if (isBlocked === true) {
      await User.updateOne({ _id: userId }, { $set: { isBlocked: false } });
      res.status(STATUS.OK).json({ message: MESSAGES.ADMIN.USER_UNBLOCKED });
    } else {
      await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
      res.status(STATUS.OK).json({ message: MESSAGES.ADMIN.USER_BLOCKED });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.BLOCK_TOGGLE, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toSalesReport = async (req, res) => {
  try {
    res.render("adminSalesReport");
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_SALES_REPORT, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const generateSalesReport = async (req, res) => {
  const { reportType, startDate, endDate } = req.body;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  let filter = {};
  const currentDate = new Date();

  switch (reportType) {
    case "daily":
      filter.orderDate = {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      };
      break;
    case "weekly":
      const today = new Date();
      const first = today.getDate() - today.getDay();
      filter.orderDate = {
        $gte: new Date(new Date(today.setDate(first)).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(today.setDate(first + 6)).setHours(23, 59, 59, 999)),
      };
      break;
    case "monthly":
      filter.orderDate = {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        $lte: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999),
      };
      break;
    case "custom":
      if (startDate && endDate) {
        filter.orderDate = {
          $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }
      break;
  }

  try {
    const results = await Order.aggregate([
      { $match: filter },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                totalDiscounts: {
                  $sum: {
                    $cond: [
                      { $gt: ["$discount", 0] },
                      "$discount",
                      {
                        $let: {
                          vars: {
                            rawDiscount: {
                              $divide: [
                                { $multiply: ["$totalAmount", { $ifNull: ["$coupon.discount", 0] }] },
                                100,
                              ],
                            },
                          },
                          in: {
                            $cond: [
                              { $gt: ["$$rawDiscount", { $ifNull: ["$coupon.maxAmount", Infinity] }] },
                              { $ifNull: ["$coupon.maxAmount", 0] },
                              "$$rawDiscount",
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
          paginatedOrders: [
            { $sort: { orderDate: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "products",
                localField: "products.product",
                foreignField: "_id",
                as: "productDetails",
              },
            },
          ],
        },
      },
    ]);

    const stats = results[0].totals[0] || { totalSales: 0, totalDiscounts: 0, count: 0 };
    const rawOrders = results[0].paginatedOrders;

    const report = rawOrders.map((order) => {
      let calculatedDiscount = order.discount || 0;

      if (!calculatedDiscount && order.coupon) {
        calculatedDiscount = (order.totalAmount * order.coupon.discount) / 100;
        if (order.coupon.maxAmount && calculatedDiscount > order.coupon.maxAmount) {
          calculatedDiscount = order.coupon.maxAmount;
        }
      }

      return {
        orderId: order.orderId,
        orderDate: order.orderDate,
        totalAmount: order.totalAmount,
        discountAmount: Number(calculatedDiscount.toFixed(2)),
        products: order.products.map((p, idx) => ({
          name: order.productDetails[idx]?.name || "Product",
          quantity: p.quantity,
          price: p.price,
          status: p.status,
        })),
      };
    });

    res.json({
      totalOrders: stats.count,
      totalSales: Number(stats.totalSales.toFixed(2)),
      totalDiscounts: Number(stats.totalDiscounts.toFixed(2)),
      orders: report,
      currentPage: page,
      totalPages: Math.ceil(stats.count / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

const downloadSalesReport = async (req, res) => {
  const { format, reportType, startDate, endDate } = req.query;

  try {
    const reportData = await generateReportData(reportType, startDate, endDate);

    if (format === "pdf") {
      const pdfBuffer = await generatePDF(reportData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.pdf"
      );
      res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await generateExcel(reportData);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.xlsx"
      );
      res.send(excelBuffer);
    } else {
      res.status(STATUS.BAD_REQUEST).send(MESSAGES.COMMON.VALIDATION_ERROR);
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.DOWNLOAD_SALES_REPORT, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const generateReportData = async (reportType, startDate, endDate) => {
  try {
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
  } catch (err) {
    console.error(MESSAGES.ERRORS.REPORT_DATA_GENERATION, err);
    throw err;
  }
};

module.exports = {
  toAdminDash,
  loginHome,
  verifyLogin,
  adminLogout,
  toUserMgmt,
  userBlockToggle,
  toSalesReport,
  downloadSalesReport,
  generateSalesReport,
};
