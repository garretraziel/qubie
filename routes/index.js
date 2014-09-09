var express = require('express');

var secure = require('../lib/secure');

module.exports = function (db, passport) {
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
            secure.hashPassword(req.body.password, function (hash) {
                db.User.create({
                    username: req.body.username,
                    password: hash,
                    email: req.body.email,
                    premium: false,
                    admin: false,
                    quota: 0, // TODO: quota!
                    used_space: 0
                }).success(function () {
                    res.redirect('/login'); // TODO: flash!
                }).error(function (err) {
                    console.error("ERR during saving user: ", err);
                    res.redirect('/register');
                });
            });
        });
    router.get('/fail', function (req, res) {
        res.render('fail');
    });

    return router;
};