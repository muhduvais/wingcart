const User = require('../model/usersModel');

//check before userHome
const isUserActive = (req, res, next) => {
    if(req.session.user) {
        next();
    }
    else {
        res.redirect("/userLogin");
    }
}

const isUserActiveJ = (req, res, next) => {
    if(req.session.user) {
        next();
    }
    else {
        res.json({ isActive: false });
    }
}

const isUserBlocked = async (req, res, next) => {
    const user = await User.findById(req.session.user);
    if(user.isBlocked) {
        delete req.session.user;
        res.redirect('/userLogin');
    }
    else {
        next();
    }
}



module.exports = {
    isUserActive,
    isUserActiveJ,
    isUserBlocked
}