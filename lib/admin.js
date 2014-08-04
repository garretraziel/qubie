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

    router.get('/', function (req, res) {
        res.render('admin');
    });

    router.get('/users', function (req, res) {
        db.User.all().success(function (users) {
            res.render('admin/users', {users: users});
        });
    });
};

module.exports.adminRouter = router;