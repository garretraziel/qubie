var express = require('express');
var multiparty = require('multiparty');
var fs = require('fs');

var filemgr = require('../lib/filemgr');

module.exports = function (config, db, memstore, s3bucket) {
    var router = express.Router();

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            next();
        } else {
            res.redirect('/login'); // TODO: flash a navrat zpet
        }
    });

    router.get('/', function (req, res) {
        req.user.getDocuments().success(function (documents) {
            res.render('user', {documents: documents, user: req.user});
        });
    });
    router.route('/upload')
        .get(function (req, res) {
            res.render('user/upload');
        })
        .post(function (req, res) {
            var form = new multiparty.Form(); // TODO: asi nejdriv nejaka bezpecnost
            // TODO: uklizet soubory
            // TODO: upload do aws, cteni/zapis do databaze

            form.on('part', function (part) {
                filemgr.uploadAndSaveFile(s3bucket, part, req.user, db, function (err) {
                    if (err) {
                        console.error(err);
                        part.resume(); // TODO: tady naznacit, ze jsem nad limitem
                    }
                });
            });

            form.on('close', function () {
                res.redirect('back');
            });

            form.parse(req);
        });

    return router;
};
