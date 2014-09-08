var express = require('express');
var router = new express.Router();

var secure = require('./secure');

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
            res.render('admin/user_detail', {user: user}); // TODO: vyrenderovat i jeho dokumenty
        });
    });
    router.route('/user/:database_id/edit')
        .get(function (req, res) {
            db.User.find(req.params.database_id).success(function (user) {
                res.render('admin/user_edit', {user: user});
            });
        })
        .post(function (req, res) {
            db.User.find(req.params.database_id).success(function (user) {
                if (user === null) {
                    console.error("Err: trying to edit non-existent user:", req.params.database_id);
                    res.redirect('back');
                } else {
                    var updated = {};
                    ["username", "email", "premium", "premium_to", "admin", "quota"].forEach(function (item) {
                        if (req.body[item] === null) {
                            updated[item] = false;
                        } else if (req.body[item] === "") {
                            updated[item] = null;
                        } else {
                            updated[item] = req.body[item];
                        }
                    });
                    if (req.body.password !== "") {
                        secure.hashPassword(req.body.password, function (hash) {
                            updated.password = hash;
                            user.updateAttributes(
                                updated,
                                ["username", "email", "premium", "premium_to", "admin", "quota", "password"]
                            ).success(function () {
                                    res.redirect('/admin/user/' + req.params.database_id);
                                });
                        });
                    } else {
                        user.updateAttributes(
                            updated,
                            ["username", "email", "premium", "premium_to", "admin", "quota"]
                        ).success(function () {
                                res.redirect('/admin/user/' + req.params.database_id);
                            });
                    }
                }
            });
        });
    router.route('/user/new')
        .get(function (req, res) {
            res.render('admin/user_edit', {user: {}});
        })
        .post(function (req, res) {
            secure.hashPassword(req.body.password, function (hash) {
                db.User.create({
                    username: req.body.username,
                    password: hash,
                    email: req.body.email,
                    premium: req.body.premium,
                    admin: req.body.admin,
                    quota: req.body.quota, // TODO: quota!
                    used_space: 0
                }).success(function () {
                    res.redirect('/admin/users'); // TODO: flash!
                }).error(function (err) {
                    console.error("ERR during creating user: ", err);
                    res.redirect('/admin/user/new');
                });
            });
        });
};

module.exports.adminRouter = router;