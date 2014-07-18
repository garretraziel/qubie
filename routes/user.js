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
        req.user.getDocuments().success(function (documents) {
            res.render('user', {documents: documents});
        });
    });
    router.get('/upload', function (req, res) {
        res.render('user/upload');
    });
    router.post('/upload', function (req, res) {
        var form = new multiparty.Form(); // TODO: asi nejdriv nejaka bezpecnost
        // TODO: uklizet soubory
        var s3bucket = new AWS.S3({params: {Bucket: config.aws_bucket}});
        // TODO: upload do aws, cteni/zapis do databaze

        form.on('part', function (part) {
            var id = shortId.generate();

            if (part.filename === null) {
                console.log("Got unhandled field: " + part.name);
                part.resume();
            }

            if (part.filename !== null) {
                part.length = part.byteCount; // TODO: jak je to presne s velikosti?
                s3bucket.putObject({
                    Key: id,
                    Body: part,
                    ACL: 'public-read' // TODO: asi nejake signed url
                }, function (err, data) {
                    if (err) {
                        console.error("ERR S3:", err); // TODO: resit nejak vic
                    } else {
                        db.Document.create({
                            // TODO: url ziskat nejak rozumnejic
                            url: "https://" + config.aws_bucket + ".s3.amazonaws.com/" + id,
                            id: id,
                            name: part.filename
                        }).success(function (document) {
                            document.setUser(req.user);
                        });
                    }
                });
            }
        });

        form.on('close', function () {
            res.redirect('back');
        });

        form.parse(req);
    });
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    return router;
};