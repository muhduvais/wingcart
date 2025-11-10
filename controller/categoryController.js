const User = require("../model/usersModel");
const Category = require("../model/categoriesModel");
const { STATUS } = require("../enums/statusCodes");
const { MESSAGES } = require("../constants/messages");

const ITEMS_PER_PAGE = 5;

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

    // count categories (fixed to use Category)
    const totalCategories = await Category.countDocuments(query);

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
    console.error(MESSAGES.ERRORS.FETCH_CATEGORIES, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
      res.status(STATUS.OK).json({ success: true, message: MESSAGES.CATEGORY.ADD_SUCCESS });
    } else {
      res.status(STATUS.OK).json({ message: MESSAGES.CATEGORY.ALREADY_EXISTS });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.ADD_CATEGORY, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
      res.status(STATUS.OK).json({ message: MESSAGES.CATEGORY.UNLISTED });
    } else {
      await Category.updateOne(
        { _id: categoryId },
        { $set: { isListed: true } }
      );
      res.status(STATUS.OK).json({ message: MESSAGES.CATEGORY.LISTED });
    }
  } catch (err) {
    console.error(MESSAGES.ERRORS.CATEGORY_LIST_TOGGLE, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
  }
};

const toEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.category_id;
    const category = await Category.findOne({ _id: categoryId });
    res.render("editCategory", { category, categoryId });
  } catch (err) {
    console.error(MESSAGES.ERRORS.FETCH_EDIT_CATEGORY, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
      return res.status(STATUS.OK).json({ message: MESSAGES.CATEGORY.ALREADY_EXISTS });
    }

    await Category.updateOne(
      { _id: req.params.category_id },
      { $set: { name, description } }
    );

    console.log("Category updated");
    res.status(STATUS.OK).json({ success: true, message: MESSAGES.CATEGORY.UPDATE_SUCCESS });
  } catch (err) {
    console.error(MESSAGES.ERRORS.EDIT_CATEGORY, err);
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.COMMON.SERVER_ERROR);
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
