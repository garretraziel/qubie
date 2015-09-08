"use strict";

var levelup = require('level');
var async = require('async');
var winston = require('winston');

function init(config) {
    return levelup(config.level_db, {keyEncoding: 'json', valueEncoding: 'json'});
}

function putDrawingEvent(db, id, page, event, done) {
    async.parallel([
        function (callback) {
            db.get(id + ":" + page, function (err, result) {
                if (err && !err.notFound) {
                    return callback(err)
                }
                if (!result) {
                    result = [];
                }
                result.push(event);
                db.put(id + ":" + page, result, callback);
            });
        },
        function (callback) {
            db.get(id, function (err, result) {
                if (err && !err.notFound) {
                    return callback(err)
                }
                if (!result) {
                    result = [];
                }
                if (result.indexOf(page) === -1) {
                    result.push(page);
                }
                db.put(id, result, callback);
            });
        }
    ], function (err) {
        if (done) {
            return done(err);
        }
        if (err) {
            winston.error('during operating with drawdb:', err);
        }
    });
}

function getDrawingEventsForPage(db, id, page, done) {
    db.get(id + ":" + page, function (err, result) {
        if (err && !err.notFound) {
            return done(err);
        }
        if (!result) {
            result = [];
        }
        done(null, result);
    });
}

function deleteDrawingsForPage(db, id, page, done) {
    async.parallel([
        function (callback) {
            db.del(id + ":" + page, callback);
        },
        function (callback) {
            db.get(id, function (err, result) {
                if (err && !result.notFound) {
                    return callback(err);
                }
                if (result && result.indexOf(page) !== -1) {
                    result.splice(result.indexOf(page), 1);
                    db.put(id, result, callback);
                } else {
                    callback(null);
                }
            });
        }
    ], function (err) {
        if (done) {
            return done(err);
        }
        if (err) {
            winston.error('during operating with drawdb:', err);
        }
    });
}

module.exports = {
    init: init,
    putDrawingEvent: putDrawingEvent,
    getDrawingEventsForPage: getDrawingEventsForPage,
    deleteDrawingsForPage: deleteDrawingsForPage
};
