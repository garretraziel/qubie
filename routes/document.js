"use strict";

var url = require('url');
var express = require('express');
var AWS = require('aws-sdk');
var winston = require('winston');

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
            var document;
            db.Document.find(req.params.document_id).then(function (d) {
                if (d === null) {
                    throw "Document doesn't exist";
                }
                document = d;
                return d.getUser();
            }).then(function (result) {
                if (result === null) {
                    throw "Document doesn't have owner";
                }

                if (result.id === req.user.id) {
                    res.render('document/root', {
                        ID: req.params.document_id,
                        name: document.name
                    });
                } else {
                   res.redirect('/fail');
                }
            }, function (err) {
                winston.error("during reading document: %s", String(err));
                res.redirect('/fail');
            });
        } else {
            res.redirect('/login');
        }
    });
    router.get('/:document_id/document', function (req, res) {
        if (req.isAuthenticated()) {
            var document;
            db.Document.find(req.params.document_id).then(function (d) {
                if (d === null) {
                    throw "Document doesn't exist";
                }
                document = d;
                return d.getUser();
            }).then(function (result) {
                if (result === null) {
                    throw "Document doesn't have owner";
                }

                if (result.id === req.user.id) {
                    var params = {Key: document.key};
                    s3bucket.getObject(params).createReadStream().pipe(res);
                } else {
                    res.redirect('/fail');
                }
            }, function (err) {
                winston.error("during reading document: %s", String(err));
                res.redirect('/fail');
            });
        } else {
            res.redirect('/login');
        }
    });
    router.get('/p/:presenter_id', function (req, res) {
        memdb.getDocumentFromPresenter(memstore, req.params.presenter_id, function (id) {
            if (id === false) {
                res.redirect('/fail');
            } else {
                res.render('document/presenter', {
                    presenter_id: req.params.presenter_id
                });
            }
        });
    });
    router.get('/d/:pdf_id', function (req, res) {
        memdb.getDocumentFromPdfId(memstore, req.params.pdf_id, function (id) {
            if (id === false) {
                res.redirect('/fail');
            } else {
                db.Document.find(id).success(function (document) {
                    if (document === null) {
                        winston.error('when trying to render document that isn`t in database');
                        res.redirect('/fail');
                    } else {
                        var params = {Key: document.key};
                        s3bucket.getObject(params).createReadStream().pipe(res);
                    }
                });
            }
        });
    });

    return router;
};
