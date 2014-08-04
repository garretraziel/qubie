var express = require('express');

var secure = require('../lib/secure');

module.exports = function (db, passport) {
    var router = express.Router();

    router.get('/', function (req, res) {
        res.render('index');
    });
    router.get('/login', function (req, res) {
        res.render('login');
    });
    router.post('/login', passport.authenticate('local', {
        successRedirect: '/user',
        failureRedirect: '/login'
        //failureFlash: true // TODO: flash uz neni
    }));
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });
    router.get('/register', function (req, res) {
        res.render('register');
    });
    router.post('/register', function (req, res) {
        secure.hashPassword(req.body.password, function (hash) {
            db.User.create({
                username: req.body.username,
                password: hash,
                premium: false,
                admin: false,
                quota: 0 // TODO: quota!
            }).success(function () {
                res.redirect('/login'); // TODO: flash!
            }).failure(function (err) {
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