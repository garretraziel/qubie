"use strict";

var express = require('express');
var multiparty = require('multiparty');
var async = require('async');
var fs = require('fs');
var winston = require('winston');

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
        async.parallel({
            documents: function (callback) {
                req.user.getDocuments().success(function (documents) {
                    callback(null, documents);
                }).error(function (err) {
                    callback(err);
                });
            },
            used_space: function (callback) {
                req.user.used_space(callback);
            }
        }, function (err, results) {
            if (err) {
                winston.error('during rendering user page: %s', String(err));
                res.redirect('/fail');
            } else {
                results.user = req.user;
                res.render('user', results);
            }
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
                        winston.error("during uploading file: %s", String(err));
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
