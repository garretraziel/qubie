var express = require('express');
var AWS = require('aws-sdk');
var multiparty = require('multiparty');
var shortId = require('shortid');
var fs = require('fs');

module.exports = function (config, db, memstore) {
    var router = express.Router();
    var s3bucket = new AWS.S3({params: {Bucket: config.aws_bucket}});

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            next();
        } else {
            res.redirect('/login'); // TODO: flash a navrat zpet
        }
    });
    router.param('document_id', function (req, res, next, document_id) {
        var regex = /^\d+$/;
        if (regex.test(document_id)) {
            next();
        } else {
            next('route');
        }
    });

    router.get('/', function (req, res) {
        req.user.getDocuments().success(function (documents) {
            res.render('user', {documents: documents, user: req.user});
        });
    });
    router.get('/upload', function (req, res) {
        res.render('user/upload');
    });
    router.post('/upload', function (req, res) {
        var form = new multiparty.Form(); // TODO: asi nejdriv nejaka bezpecnost
        // TODO: uklizet soubory
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
                    ACL: 'private' // TODO: asi nejake signed url
                }, function (err, data) {
                    if (err) {
                        console.error("ERR S3:", err); // TODO: resit nejak vic
                    } else {
                        db.Document.create({
                            // TODO: url ziskat nejak rozumnejic
                            key: id,
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
    router.get('/:document_id', function (req, res) {
        db.Document.find(req.params.document_id).success(function (document) {
            document.getUser().success(function (result) {
                if (result.id === req.user.id) {
                    res.render('user/root', {
                        ID: req.params.document_id,
                        name: document.name
                    });
                } else {
                    res.redirect('/fail');
                }
            });
        });
    });
    router.get('/:document_id/document', function (req, res) {
        db.Document.find(req.params.document_id).success(function (document) {
            document.getUser().success(function (result) {
                if (result.id === req.user.id) {
                    var params = {Key: document.key};
                    s3bucket.getObject(params).createReadStream().pipe(res);
                } else {
                    res.redirect('/fail');
                }
            });
        });
    });

    return router;
};