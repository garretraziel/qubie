var express = require('express');

var secure = require('../lib/secure');

module.exports = function (config, db) {
    var router = express.Router();

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            if (req.user.admin) {
                next();
            } else {
                res.redirect('/fail');
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
            db.User.findAll({where: {email: req.query.search_email}}).success(function (users) {
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
            if (user === null) {
                res.render('404');
            } else {
                res.render('admin/user_detail', {user: user}); // TODO: vyrenderovat i jeho dokumenty
            }
        });
    });
    router.route('/user/:database_id/edit')
        .get(function (req, res) {
            db.User.find(req.params.database_id).success(function (user) {
                if (user === null) {
                    res.render('404');
                } else {
                    res.render('admin/user_edit', {user: user});
                }
            });
        })
        .post(function (req, res) {
            secure.changeUser(db, {
                database_id: req.params.database_id,
                username: req.body.username,
                email: req.body.email,
                premium: req.body.premium,
                premium_to: req.body.premium_to,
                admin: req.body.admin,
                quota: req.body.quota,
                password: req.body.password
            }, function (err) {
                if (err) {
                    console.error('ERR during changing user: ', err);
                    res.redirect('back');
                } else {
                    res.redirect('/admin/user/' + req.params.database_id);
                }
            });
        });
    router.route('/user/new')
        .get(function (req, res) {
            res.render('admin/user_edit', {user: {}});
        })
        .post(function (req, res) {
            secure.createUser(config, db, {
                username: req.body.username,
                password: req.body.password,
                email: req.body.email,
                premium: req.body.premium,
                admin: req.body.admin,
                quota: req.body.quota
            }, function (err) {
                if (err) {
                    console.error('ERR during creating user: ', err);
                    res.redirect('/admin/user/new');
                } else {
                    res.redirect('/admin'); // TODO: flash!
                }
            });
        });

    return router;
};