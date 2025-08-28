const Category = require("../model/categoriesModel");
const Product = require("../model/productsModel");
const Brand = require("../model/brandsModel");
const Cart = require("../model/cartModel");
const sharp = require("sharp");

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

const upload = multer({ storage });

const toProductMgmt = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    };

    const products = await Product.find(query).skip(skip).limit(ITEMS_PER_PAGE);
    const totalProducts = await Product.countDocuments(query);

    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    res.render("productManagement", {
      products: products,
      pagination: {
        currentPage: page,
        pages: totalPages,
      },
      search: search,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Internal Server Error");
  }
};

const toAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({});
    const brands = await Brand.find({});
    res.render("addProduct", { categories, brands });
  } catch (err) {
    console.error("Error fetching add product:", err);
    res.status(500).send("Internal Server Error");
  }
};

const verifyAddProduct = async (req, res) => {
  try {
    const {
      productName,
      model,
      description,
      price,
      type,
      strapType,
      color,
      category,
      brand,
      stock,
    } = req.body;
    const regName = new RegExp(productName, "i");
    const isProductPresent = await Product.findOne({
      name: { $regex: regName },
    });

    const images = [];

    const width = 300;
    const height = 300;

    if (req.files.image1) {
      const processedImage1 = await processImage(
        req.files.image1[0],
        width,
        height
      );
      images.push(processedImage1);
    }
    if (req.files.image2) {
      const processedImage2 = await processImage(
        req.files.image2[0],
        width,
        height
      );
      images.push(processedImage2);
    }
    if (req.files.image3) {
      const processedImage3 = await processImage(
        req.files.image3[0],
        width,
        height
      );
      images.push(processedImage3);
    }

    if (!isProductPresent) {
      const newProduct = new Product({
        name: productName,
        model,
        description,
        price,
        type,
        strapType,
        color,
        category,
        brand,
        stock,
        images,
        addedDate: new Date(),
        isDeleted: false,
      });

      await newProduct.save();
      console.log("Product saved");
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ message: "Product name already exists!" });
    }
  } catch (err) {
    console.error("Error adding the product", err);
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

const verifyEditProduct = async (req, res) => {
  try {
    const {
      productName,
      model,
      description,
      price,
      type,
      strapType,
      color,
      category,
      brand,
      stock,
      existingImage1,
      existingImage2,
      existingImage3,
    } = req.body;
    const regName = new RegExp(productName, "i");
    const isProductPresent = await Product.findOne({
      name: { $regex: regName },
      _id: { $ne: req.params.product_id },
    });

    const images = [];

    const width = 300;
    const height = 300;

    if (req.files.image1) {
      const processedImage1 = await processImage(
        req.files.image1[0],
        width,
        height
      );
      images.push(processedImage1);
      console.log("Pushing new image");
    } else {
      console.log("Pushing existing image");
      images.push(existingImage1);
    }

    if (req.files.image2) {
      const processedImage2 = await processImage(
        req.files.image2[0],
        width,
        height
      );
      images.push(processedImage2);
    } else {
      images.push(existingImage2);
    }

    if (req.files.image3) {
      const processedImage3 = await processImage(
        req.files.image3[0],
        width,
        height
      );
      images.push(processedImage3);
    } else {
      images.push(existingImage3);
    }

    if (!isProductPresent) {
      await Product.updateOne(
        { _id: req.params.product_id },
        {
          name: productName,
          model: model,
          description: description,
          price: price,
          type: type,
          strapType: strapType,
          color: color,
          category: category,
          brand: brand,
          stock: stock,
          images: images,
          addedDate: new Date(),
          isDeleted: false,
        }
      );

      console.log("Product updated");
      res.status(200).json({ success: true });

      //////
      const carts = await Cart.find({
        "products.product": req.params.product_id,
      });

      for (let cart of carts) {
        cart.products.forEach((item) => {
          if (
            item.product.toString() === req.params.product_id &&
            item.quantity > stock
          ) {
            item.quantity = stock;
          } else if (
            item.product.toString() === req.params.product_id &&
            item.quantity === 0 &&
            stock > 0
          ) {
            item.quantity = 1;
          }
        });
        await cart.save();
      }
      //////
    } else {
      res.status(200).json({ message: "Product name already exists!" });
    }
  } catch (err) {
    console.error("Error editing the product", err);
    res.status(500).send("Internal Server Error");
  }
};

const productListToggle = async (req, res) => {
  try {
    const { productId, isListed } = req.body;
    console.log(productId, isListed);
    if (isListed === true) {
      await Product.updateOne(
        { _id: productId },
        { $set: { isListed: false } }
      );
      res.status(200).json({ message: "Product Unlisted" });
    } else {
      await Product.updateOne({ _id: productId }, { $set: { isListed: true } });
      res.status(200).json({ message: "Product Listed" });
    }
  } catch (err) {
    console.error("Error on product list toggle:", err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  upload,
  toProductMgmt,
  toAddProduct,
  verifyAddProduct,
  toEditProduct,
  verifyEditProduct,
  productListToggle,
};
