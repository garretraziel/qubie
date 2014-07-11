var express = require('express');

module.exports = function (db, memstore) {
    var router = express.Router();

    router.get('/', function (req, res) {
        if (req.isAuthenticated()) {
            res.render('user', {username: req.user.username});
        } else {
            res.redirect('/login');
        }
    });

    return router;
};