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

const isUserBlocked = async (req, res, next) => {
    const user = await User.findOne({ _id: req.session.user._id });
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
    isUserBlocked
}