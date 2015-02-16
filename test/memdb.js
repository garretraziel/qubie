"use strict";

var assert = require('assert');
var async = require('async');
var redis = require('redis');

var memdb = require('../lib/memdb');

describe('memdb', function () {
    var config = {redis_uri: 'redis://localhost:6379'};
    var passConfig = {redis_uri: 'redis://localhost:password:6379'};
    var id = 1;
    var id_not_online = 2;
    var nonexistent_id = 246;
    var memstore_id = 'document:' + id;
    var memstore_online_id = memstore_id + ':online';
    var nonexistent_mem_id = 'document:' + nonexistent_id;
    var page = 17;
    var default_page = 15;
    var online_count = 13;
    var memstore = {};
    var memstore_fail = {};
    memstore[memstore_id] = {page: page.toString()};
    memstore[memstore_online_id] = online_count;
    memstore[nonexistent_mem_id] = {page: null};
    memstore.hget = function (id, key, done) {
        if (this[id][key] === undefined) {
            return done(null, null);
        }
        return done(null, this[id][key]);
    };
    memstore.hset = function (id, key, value) {
        this[id][key] = value.toString();
    };
    memstore.hdel = function (id, key) {
        delete this[id][key];
    };
    memstore.incr = function (id, done) {
        done(null, this[id] + 1);
    };
    memstore.decr = function (id, done) {
        done(null, this[id] - 1);
    };
    memstore.get = function (id, done) {
        if (this[id]) {
            return done(null, this[id]);
        }
        return done(null, null);
    };
    memstore.set = function (id, value) {
        this[id] = value;
    };
    memstore.del = function (id) {
        delete this[id];
    };
    memstore_fail.hget = function (id, key, done) {
        return done(new Error('Cannot get values from redis'));
    };
    memstore_fail.get = function (id, done) {
        return done(new Error('Cannot get values from redis'));
    };
    memstore_fail.incr = memstore_fail.decr = function (id, done) {
        return done(new Error('Cannot get values from redis'));
    };

    describe('#getPage', function () {
        it('should return page value from memstore', function (done) {
            memdb.getPage(memstore, id, default_page, function (obtained_page) {
                assert.equal(obtained_page, page);
                done();
            });
        });

        it('should fall back to default page when page is not in db', function (done) {
            memdb.getPage(memstore, nonexistent_id, default_page, function (obtained_page) {
                assert.equal(obtained_page, default_page);
                done();
            });
        });

        it('should return default page when server is unable to connect to db', function (done) {
            memdb.getPage(memstore_fail, id, default_page, function (obtained_page) {
                assert.equal(obtained_page, default_page);
                done();
            });
        });
    });

    describe('#putPage', function () {
        it('should set page for document', function (done) {
            memdb.putPage(memstore, nonexistent_id, page);
            memdb.getPage(memstore, nonexistent_id, default_page, function (obtained_page) {
                assert.equal(obtained_page, page);
                done();
            });
        });
    });

    describe('#incrOnline', function () {
        it('should increase online count', function (done) {
            memdb.incrOnline(memstore, id, function (obtained_count) {
                assert.equal(obtained_count, online_count + 1);
                done();
            });
        });

        it('should return 0 when there was error during reading from db', function (done) {
            memdb.incrOnline(memstore_fail, id, function (obtained_count) {
                assert.equal(obtained_count, 0);
                done();
            });
        });
    });

    describe('#decrOnline', function () {
        it('should decrease online count', function (done) {
            memdb.decrOnline(memstore, id, function (obtained_count) {
                assert.equal(obtained_count, online_count - 1);
                done();
            });
        });

        it('should return 0 when there was error during reading from db', function (done) {
            memdb.decrOnline(memstore_fail, id, function (obtained_count) {
                assert.equal(obtained_count, 0);
                done();
            });
        });
    });

    describe('#getOnline', function () {
        it('should return online count for given document and page', function (done) {
            memdb.getOnline(memstore, id, function (obtained_count) {
                assert.equal(obtained_count, online_count);
                done();
            });
        });

        it('should return 0 when there is no online count for document and page', function (done) {
            memdb.getOnline(memstore, id_not_online, function (obtained_count) {
                assert.equal(obtained_count, 0);
                done();
            });
        });

        it('should return 0 when there is an error in db connection', function (done) {
            memdb.getOnline(memstore_fail, id, function (obtained_count) {
                assert.equal(obtained_count, 0);
                done();
            });
        });
    });

    describe('#presenterEnabled', function () {
        it('should return false when presenter is disabled', function (done) {
            memdb.presenterEnabled(memstore, id, function (result) {
                assert.equal(result, false);
                done();
            });
        });

        it('should return true when presenter is enabled', function (done) {
            memdb.enablePresenter(memstore, id, function () {
                memdb.presenterEnabled(memstore, id, function (result, pres_id) {
                    assert.equal(result, true);
                    assert.notEqual(pres_id, null);
                    memdb.disablePresenter(memstore, id);
                    done();
                });
            });
        });

        it('should return false when there was error during reading from db', function (done) {
            memdb.presenterEnabled(memstore_fail, id, function (result) {
                assert.equal(result, false);
                done();
            });
        });
    });

    describe('#enablePresenter', function () {
        it('should generate presenter and pdf IDs a set them in db', function (done) {
            async.series([
                function (callback) {
                    memdb.presenterEnabled(memstore, id, function (result) {
                        assert.equal(result, false);
                        callback();
                    });
                },
                function (callback) {
                    memdb.enablePresenter(memstore, id, function () {
                        callback();
                    });
                },
                function (callback) {
                    memdb.presenterEnabled(memstore, id, function (result) {
                        assert.equal(result, true);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });
    });

    describe('#disablePresenter', function () {
        it('should remove records about presenter from db', function (done) {
            async.series([
                function (callback) {
                    memdb.enablePresenter(memstore, id, function () {
                        callback();
                    });
                },
                function (callback) {
                    memdb.presenterEnabled(memstore, id, function (result) {
                        assert.equal(result, true);
                        callback();
                    });
                },
                function (callback) {
                    memdb.disablePresenter(memstore, id);
                    memdb.presenterEnabled(memstore, id, function (result) {
                        assert.equal(result, false);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });
    });

    describe('#getDocumentFromPresenter', function () {
        it('should return document ID for given presenter', function (done) {
            async.waterfall([
                function (callback) {
                    memdb.enablePresenter(memstore, id, function (presenter_id) {
                        callback(presenter_id);
                    });
                },
                function (presenter_id, callback) {
                    memdb.getDocumentFromPresenter(memstore, presenter_id, function (obtained_id) {
                        assert.equal(obtained_id, id);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return false when presenter ID is not in db', function (done) {
            memdb.getDocumentFromPresenter(memstore, nonexistent_id, function (result) {
                assert.equal(result, false);
                done();
            });
        });

        it('should return false when there was error during reading from db', function (done) {
            memdb.getDocumentFromPresenter(memstore_fail, id, function (result) {
                assert.equal(result, false);
                done();
            });
        });
    });

    describe('#getPdfId', function () {
        it('should return PDF ID for document with enabled presenter', function (done) {
            memdb.enablePresenter(memstore, id, function () {
                memdb.getPdfId(memstore, id, function (pdf_id) {
                    assert.equal(typeof pdf_id, 'string');
                    done();
                });
            });
        });

        it('should return false when presenter is not enabled', function (done) {
            memdb.disablePresenter(memstore, id);
            memdb.getPdfId(memstore, id, function (result) {
                assert.equal(result, false);
                done();
            });
        });

        it('should return false when there was error during reading from db', function (done) {
            memdb.getPdfId(memstore_fail, id, function (result) {
                assert.equal(result, false);
                done();
            });
        });
    });

    describe('#getDocumentFromPdfId', function () {
        it('should return document ID from pdf ID', function (done) {
            async.waterfall([
                function (callback) {
                    memdb.enablePresenter(memstore, id, function () {
                        callback();
                    });
                },
                function (callback) {
                    memdb.getPdfId(memstore, id, function (result) {
                        callback(result);
                    });
                },
                function (pdf_id, callback) {
                    memdb.getDocumentFromPdfId(memstore, pdf_id, function (result) {
                        assert.equal(result, id);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return false when there is no pdf with given ID', function (done) {
            async.waterfall([
                function (callback) {
                    memdb.enablePresenter(memstore, id, function () {
                        callback();
                    });
                },
                function (callback) {
                    memdb.getPdfId(memstore, id, function (pdf_id) {
                        callback(pdf_id);
                    });
                },
                function (pdf_id, callback) {
                    memdb.disablePresenter(memstore, id);
                    memdb.getDocumentFromPdfId(memstore, pdf_id, function (result) {
                        assert.equal(result, false);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return false when there was error during reading from db', function (done) {
            memdb.getDocumentFromPdfId(memstore_fail, '0', function (result) {
                assert.equal(result, false);
                done();
            });
        });
    });
});
