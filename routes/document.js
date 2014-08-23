var express = require('express');
var AWS = require('aws-sdk');

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
    router.get('/:document_id/control', function (req, res) {
        res.render('document/presenter', {ID: req.params.document_id});
    });
    router.get('/p/:presenter_id', function (req, res) {

    });

    return router;
};
