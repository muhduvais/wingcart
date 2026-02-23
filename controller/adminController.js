const User = require("../model/usersModel");
const Order = require("../model/ordersModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const generatePDF = (reportData) => {
  return new Promise((resolve, reject) => {
    // Standard A4 with slightly larger margins for a premium feel
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // LOGO & HEADER
    doc.fillColor("#2c3e50").fontSize(24).text("HelpOre", { align: "left" });
    doc.fontSize(10).fillColor("#7f8c8d").text("Official Sales Statement", { align: "left" });
    doc.moveUp();
    doc.fillColor("#34495e").fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "right" });
    
    doc.moveTo(40, 90).lineTo(555, 90).strokeColor("#ecf0f1").stroke();
    doc.moveDown(2);

    // SUMMARY CARDS (Using Rectangles for a Modern Look)
    const cardWidth = 160;
    const cardHeight = 50;
    const startX = 40;
    const startY = 110;

    // Backgrounds for cards
    [0, 1, 2].forEach(i => {
      doc.roundedRect(startX + (i * 175), startY, cardWidth, cardHeight, 5).fill("#f8f9fa");
    });

    doc.fillColor("#2c3e50").fontSize(10);
    doc.text("TOTAL ORDERS", startX + 10, startY + 10);
    doc.fontSize(14).text(`${reportData.totalOrders}`, startX + 10, startY + 25);

    doc.fontSize(10).text("TOTAL REVENUE", startX + 185, startY + 10);
    doc.fontSize(14).text(`INR ${reportData.totalSales.toFixed(2)}`, startX + 185, startY + 25);

    doc.fontSize(10).text("TOTAL DISCOUNTS", startX + 360, startY + 10);
    doc.fontSize(14).text(`INR ${reportData.totalDiscounts.toFixed(2)}`, startX + 360, startY + 25);

    doc.moveDown(4);

    // TABLE HEADERS (Better spacing to avoid overlap seen in your image)
    const tableTop = 190;
    doc.fillColor("#ffffff").rect(40, tableTop, 515, 20).fill("#2c3e50");
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("ORDER ID", 50, tableTop + 6);
    doc.text("DATE", 160, tableTop + 6);
    doc.text("PRODUCT DETAILS", 240, tableTop + 6);
    doc.text("DISCOUNT", 440, tableTop + 6, { width: 50, align: 'right' });
    doc.text("TOTAL", 500, tableTop + 6, { width: 50, align: 'right' });

    // ROWS
    let y = tableTop + 25;
    doc.fillColor("#000000").font("Helvetica").fontSize(8);

    reportData.orders.forEach((order, i) => {
      if (y > 750) { doc.addPage(); y = 50; }
      
      // Zebra Striping
      if (i % 2 === 0) {
        doc.rect(40, y - 5, 515, 20).fill("#fcfcfc");
      }

      const products = order.products.map(p => `${p.productName} (x${p.quantity})`).join(", ");
      
      doc.fillColor("#34495e").text(order.orderId, 50, y);
      doc.text(new Date(order.orderDate).toLocaleDateString(), 160, y);
      doc.text(products, 240, y, { width: 190 });
      doc.text(`${order.discountAmount.toFixed(2)}`, 440, y, { width: 50, align: 'right' });
      doc.text(`${order.totalAmount.toFixed(2)}`, 500, y, { width: 50, align: 'right' });

      y += Math.max(20, doc.heightOfString(products, { width: 190 }) + 10);
    });

    doc.end();
  });
};

const generateExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Analytics");

  // Add Company Branding at the top
  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = "HELPORE SALES REPORT";
  sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Set Headers
  const headerRow = sheet.addRow(["Order ID", "Date", "Product Details", "Discount (INR)", "Total (INR)"]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // Add Data
  reportData.orders.forEach((order) => {
    const productDetails = order.products.map(p => `${p.productName} (x${p.quantity})`).join(", ");
    const row = sheet.addRow([
      order.orderId,
      new Date(order.orderDate).toLocaleDateString(),
      productDetails,
      order.discountAmount,
      order.totalAmount
    ]);
    
    // Number Formatting
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
  });

  // Styling the Footer Totals
  sheet.addRow([]); // Blank row
  const footer = sheet.addRow(["", "", "GRAND TOTALS", reportData.totalDiscounts, reportData.totalSales]);
  footer.font = { bold: true };
  footer.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1C40F' } }; // Yellow highlight
  footer.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2ECC71' } }; // Green highlight

  sheet.columns.forEach(column => {
    column.width = column.header === "Product Details" ? 45 : 20;
    column.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  return await workbook.xlsx.writeBuffer();
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
