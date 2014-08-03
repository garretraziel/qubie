var express = require('express');
var router = new express.Router();

module.exports.init = function (app, config, db) {
    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            if (req.user.admin) {
                next();
            } else {
                res.render('fail');
            }
        } else {
            res.redirect('/login');
        }
    });

    router.use('/', function (req, res) {
        res.render('admin');
    });
};

module.exports.adminRouter = router;