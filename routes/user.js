var express = require('express');
var AWS = require('aws-sdk');
var multiparty = require('multiparty');
var shortId = require('shortid');
var fs = require('fs');

module.exports = function (config, db, memstore) {
    var router = express.Router();

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            next();
        } else {
            res.redirect('/login'); // TODO: flash a navrat zpet
        }
    });

    router.get('/', function (req, res) {
        res.render('user', {username: req.user.username});
    });
    router.get('/upload', function (req, res) {
        res.render('user/upload');
    });
    router.post('/upload', function (req, res) {
        var form = new multiparty.Form(); // TODO: asi nejdriv nejaka bezpecnost

        form.parse(req, function (err, fields, files) {
            // TODO: upload do aws, cteni/zapis do databaze
            var id = shortId.generate();
            var out = fs.createWriteStream("out.out");
            files['file'][0].createReadStream().pipe(out);

            res.redirect('back');
        });
    });

    return router;
};