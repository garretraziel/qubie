var express = require('express');
var AWS = require('aws-sdk');

var memdb = require('../lib/memdb');

module.exports = function (config, db, memstore) {
    var router = express.Router();
    var s3bucket = new AWS.S3({params: {Bucket: config.aws_bucket}});

    router.param('document_id', function (req, res, next, document_id) {
        var regex = /^\d+$/;
        if (regex.test(document_id)) {
            next();
        } else {
            next('route');
        }
    });

    router.get('/:document_id', function (req, res) {
        if (req.isAuthenticated()) {
            db.Document.find(req.params.document_id).success(function (document) {
                document.getUser().success(function (result) {
                    if (result.id === req.user.id) {
                        res.render('document/root', {
                            ID: req.params.document_id,
                            name: document.name
                        });
                    } else {
                        res.redirect('/fail');
                    }
                });
            });
        } else {
            res.redirect('/login');
        }
    });
    router.get('/:document_id/document', function (req, res) {
        if (req.isAuthenticated()) {
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
        } else {
            res.redirect('/login');
        }
    });
    router.get('/p/:presenter_id', function (req, res) {
        memdb.getPresenterId(memstore, req.params.presenter_id, function (id) {
            if (id === false) {
                res.redirect('/fail');
            } else {
                res.render('document/presenter', {
                    presenter_id: req.params.presenter_id
                });
            }
        });
    });
    router.get('/d/:presenter_id', function (req, res) {
        memdb.getPresenterId(memstore, req.params.presenter_id, function (id) {
            if (id === false) {
                res.redirect('/fail');
            } else {
                db.Document.find(id).success(function (document) {
                    var params = {Key: document.key};
                    s3bucket.getObject(params).createReadStream().pipe(res);
                });
            }
        });
    });

    return router;
};
