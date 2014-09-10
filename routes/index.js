var express = require('express');

var secure = require('../lib/secure');

module.exports = function (config, db, passport) {
    var router = express.Router();

    router.get('/', function (req, res) {
        res.render('index');
    });
    router.route('/login')
        .get(function (req, res) {
            res.render('login');
        })
        .post(passport.authenticate('local', {
            successRedirect: '/user',
            failureRedirect: '/login'
            //failureFlash: true // TODO: flash uz neni
        }));
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });
    router.route('/register')
        .get(function (req, res) {
            res.render('register');
        })
        .post(function (req, res) {
            if (req.body.username === "" || req.body.email === "") {
                console.error('Bad registering credentials submitted');
                res.redirect('/register'); // TODO: fail fail
            } else {
                db.User.find({where: {username: req.body.username}}).success(function (user) {
                    if (user === null) {
                        secure.hashPassword(req.body.password, function (hash) {
                            db.User.create({
                                username: req.body.username,
                                password: hash,
                                email: req.body.email,
                                premium: false,
                                admin: false,
                                quota: config.default_quota, // TODO: quota!
                                used_space: 0
                            }).success(function () {
                                res.redirect('/login'); // TODO: flash!
                            }).error(function (err) {
                                console.error("ERR during saving user: ", err);
                                res.redirect('/register');
                            });
                        });
                    } else {
                        res.redirect('/register'); // TODO: zprava ze uz je regnutej
                    }
                });
            }
        });
    router.get('/fail', function (req, res) {
        res.render('fail');
    });

    return router;
};