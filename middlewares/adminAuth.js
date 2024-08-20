const isAdminActive = (req, res, next) => {
    if(req.session.admin) {
        next();
    }
    else {
        res.redirect("/admin/login");
    }
}

const isAdminActiveJ = (req, res, next) => {
    if(req.session.admin) {
        next();
    }
    else {
        res.json({ isActive: false });
    }
}

module.exports = { 
    isAdminActive,
    isAdminActiveJ
};