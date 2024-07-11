const User = require('../model/usersModel');

//check before userHome
const isUserActive = (req, res, next) => {
    if(req.session.user) {
        next();
    }
    else {
        res.redirect("/");
    }
}

const isUserBlocked = (req, res, next) => {
    if(req.session.user.isBlocked) {
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