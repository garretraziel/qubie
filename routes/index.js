"use strict";

var express = require('express');
var async = require('async');
var winston = require('winston');

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
            if (req.body.username === "" || req.body.email === ""
                || req.body.password === "") {
                winston.error('bad register credentials submitted');
                res.redirect('/register'); // TODO: fail fail
            } else if (req.body.password !== req.body.repeat) {
                res.redirect('/register');
            } else {
                async.waterfall([
                    function (callback) {
                        db.User.count().then(function (c) {
                            callback(null, c);
                        });
                    },
                    function (count, callback) {
                        secure.createUser(config, db, {
                            username: req.body.username,
                            password: req.body.password,
                            email: req.body.email,
                            premium: false,
                            admin: count <= 0
                        }, callback);
                    }
                ], function (err) {
                    if (err) {
                        winston.error("during creating user: %s", String(err));
                        res.redirect('/register');
                    } else {
                        res.redirect('/login');
                    }
                });
            }
        });
    router.get('/fail', function (req, res) {
        res.render('fail');
    });

    return router;
};
