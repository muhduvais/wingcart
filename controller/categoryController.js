const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");

const toCategoryMgmt = async (req, res) => {
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

    const categories = await Category.find(query)
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    const totalCategories = await User.countDocuments(query);

    const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE);

    res.render("categoryManagement", {
      categories: categories,
      pagination: {
        currentPage: page,
        pages: totalPages,
      },
      search: search,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Internal Server Error");
  }
};

const toAddCategory = (req, res) => {
  res.render("addCategory");
};

const verifyAddCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const regName = new RegExp(name, "i");
    const isPresentCategory = await Category.findOne({
      name: { $regex: regName },
    });
    if (!isPresentCategory) {
      const category = new Category({
        name: name,
        description: description,
      });
      await category.save();
      console.log("Category saved");
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ message: "Category already exists!" });
    }
  } catch (err) {
    console.error("Error adding category", err);
    res.status(500).send("Internal Server Error");
  }
};

const categoryListToggle = async (req, res) => {
  try {
    const { categoryId, isListed } = req.body;
    console.log(categoryId, isListed);
    if (isListed === true) {
      await Category.updateOne(
        { _id: categoryId },
        { $set: { isListed: false } }
      );
      res.status(200).json({ message: "Category Unlisted" });
    } else {
      await Category.updateOne(
        { _id: categoryId },
        { $set: { isListed: true } }
      );
      res.status(200).json({ message: "Category Listed" });
    }
  } catch (err) {
    console.error("Error on toggle list:", err);
    res.status(500).send("Internal Server Error");
  }
};

const toEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.category_id;
    const category = await Category.findOne({ _id: categoryId });
    res.render("editCategory", { category, categoryId });
  } catch (err) {
    console.error("Error fetching edit category:", err);
    res.status(500).send("Internal Server Error");
  }
};

const verifyEditCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const regName = new RegExp(name, "i");

    const existingCategory = await Category.findOne({
      name: { $regex: regName },
      _id: { $ne: req.params.category_id },
    });

    if (existingCategory) {
      return res.status(200).json({ message: "Category name already exists!" });
    }

    await Category.updateOne(
      { _id: req.params.category_id },
      { $set: { name, description } }
    );

    console.log("Category updated");
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error editing category!", err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  toCategoryMgmt,
  toAddCategory,
  verifyAddCategory,
  toEditCategory,
  verifyEditCategory,
  categoryListToggle,
};
