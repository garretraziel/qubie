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

    router.param('database_id', function (req, res, next, database_id) {
        var regex = /^\d+$/;
        if (regex.test(database_id)) {
            next();
        } else {
            next('route');
        }
    });

    router.get('/', function (req, res) {
        res.render('admin');
    });
    router.get('/users', function (req, res) {
        if (req.query.search_name) {
            db.User.findAll({
                where: ["username like ?", '%' + req.query.search_name + '%']
            }).success(function (users) {
                res.render('admin/users', {users: users});
            });
        } else if (req.query.search_email) {
            db.User.find({where: {email: req.query.search_email}}).success(function (users) {
                res.render('admin/users', {users: users});
            });
        } else {
            db.User.all().success(function (users) {
                res.render('admin/users', {users: users});
            });
        }
    });
    router.get('/user/:database_id', function (req, res) {
        db.User.find(req.params.database_id).success(function (user) {
            res.render('admin/user_detail', {user: user});
        });
    });
};

module.exports.adminRouter = router;