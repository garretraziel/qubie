var assert = require('assert');
var redis = require('redis');

var memdb = require('../lib/memdb');

describe('memdb', function () {
    var config = {redis_uri: "redis://localhost:6379"};
    var passConfig = {redis_uri: "redis://localhost:password:6379"};
    var id = 1;
    var id_not_online = 2;
    var nonexistent_id = 246;
    var memstore_id = "document:" + id;
    var memstore_online_id = "document:" + id + ":online";
    var nonexistent_mem_id = "document:" + nonexistent_id;
    var page = 17;
    var default_page = 15;
    var online_count = 13;
    var memstore = {};
    var memstore_fail = {};
    memstore[memstore_id] = {"page": page.toString()};
    memstore[memstore_online_id] = online_count;
    memstore[nonexistent_mem_id] = {"page": null};
    memstore.hget = function (id, key, done) {
        return done(null, this[id][key]);
    };
    memstore.hset = function (id, key, value) {
        assert(value === default_page);
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
    memstore_fail.hget = function (id, key, done) {
        return done(new Error("Cannot get values from redis"));
    };
    memstore_fail.get = function (id, done) {
        return done(new Error("Cannot get values from redis"));
    };

    describe.skip('#init', function () {
        it('should connect to redis providing redis url', function () {
            var redisClient = memdb.init(config);

            assert(redisClient instanceof redis.RedisClient);
        });

        it('should authenticate when password is provided in redis uri', function () {
            var redisClient = memdb.init(passConfig);

            assert(redisClient instanceof redis.RedisClient);
            // TODO: check ze je klient autentizovany
        });
    });

    describe('#getPage', function () {
        it('should return page value from memstore', function (done) {
            memdb.getPage(memstore, id, default_page, function (obtained_page) {
                assert(obtained_page === page);
                done();
            });
        });

        it('should fall back to default page when page is not in redis', function (done) {
            memdb.getPage(memstore, nonexistent_id, default_page, function (obtained_page) {
                assert(obtained_page === default_page);
                done();
            });
        });

        it('should return default page when server is unable to connect to redis', function (done) {
            memdb.getPage(memstore_fail, id, default_page, function (obtained_page) {
                assert(obtained_page === default_page);
                done();
            });
        });
    });

    describe('#putPage', function () {
        it('should set page for document', function () {
            memdb.putPage(memstore, nonexistent_id, default_page);
        });
    });

    describe("#incrOnline", function () {
        it('should increase online count', function (done) {
            memdb.incrOnline(memstore, id, function (obtained_count) {
                assert(obtained_count === online_count + 1);
                done();
            });
        });
    });

    describe("#decrOnline", function () {
        it('should decrease online count', function (done) {
            memdb.decrOnline(memstore, id, function (obtained_count) {
                assert(obtained_count === online_count - 1);
                done();
            });
        });
    });

    describe("#getOnline", function () {
        it('should return online count for given document and page', function (done) {
            memdb.getOnline(memstore, id, function (obtained_count) {
                assert(obtained_count === online_count);
                done();
            });
        });

        it('should return 0 when there is no online count for document and page', function (done) {
            memdb.getOnline(memstore, id_not_online, function (obtained_count) {
                assert(obtained_count === 0);
                done();
            });
        });

        it('should return 0 when there is an error in redis connection', function (done) {
            memdb.getOnline(memstore_fail, id, function (obtained_count) {
                assert(obtained_count === 0);
                done();
            });
        });
    });
});
