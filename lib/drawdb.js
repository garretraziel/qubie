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
                if (err) {
                    winston.error("during reading from leveldb: %s", String(err));
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
                if (err) {
                    winston.error("during reading from leveldb: %s", String(err));
                }
                if (!result) {
                    result = [];
                }
                if (result.indexOf(page) == -1) {
                    result.push(page);
                }
                db.put(id, result, callback);
            });
        }
    ], function (err) {
        if (done) {
            done(err);
        }
    });
}

function getDrawingEventsForPage(db, id, page, done) {
    db.get(id + ":" + page, function (err, result) {
        if (err) {
            winston.error("during reading from leveldb: %s", String(err));
        }
        if (!result) {
            result = [];
        }
        done(result);
    });
}

function deleteDrawingsForPage(db, id, page, done) {
    async.parallel([
        function (callback) {
            db.del(id + ":" + page, callback);
        },
        function (callback) {
            db.get(id, function (err, result) {
                if (err) {
                    winston.error("during reading document from leveldb: %s", String(err));
                }
                if (result && result.indexOf(page) != -1) {
                    result.splice(result.indexOf(page), 1);
                    db.put(id, result, callback);
                } else {
                    callback(null);
                }
            });
        }
    ], function (err) {
        if (done) {
            done(err);
        }
    });
}

module.exports = {
    init: init,
    putDrawingEvent: putDrawingEvent,
    getDrawingEventsForPage: getDrawingEventsForPage,
    deleteDrawingsForPage: deleteDrawingsForPage
};
