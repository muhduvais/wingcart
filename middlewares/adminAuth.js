const isAdminActive = (req, res, next) => {
    if(req.session.admin) {
        next();
    }
    else {
        res.redirect("/admin/login");
    }
}

module.exports = isAdminActive;