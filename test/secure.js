var assert = require('assert');
var async = require('async');
var bcrypt = require('bcrypt');

var secure = require('../lib/secure');

describe('secure', function () {
    var user_id = 123;
    function createDummyDb(user, password, isnull, iserror) {
        return {
            User: {
                find: function () {
                    return {
                        success: function (done) {
                            if (!iserror) {
                                if (isnull) {
                                    done(null)
                                } else {
                                    done({
                                        id: user_id,
                                        name: user,
                                        password: password
                                    });
                                }
                            }
                            return {
                                error: function (done) {
                                    if (iserror) {
                                        done(new Error('Error during reading from db'));
                                    }
                                }
                            };
                        }
                    };
                }
            }
        };
    }

    describe('#redirectSec', function () {
        it('should redirect to https when accessing from http', function (done) {
            async.parallel([
                function (callback) {
                    var req = {
                        headers: {'x-forwarded-proto': 'http', 'host': 'qubie.com'},
                        path: '/document/d/123456'
                    };
                    var res = 'https://qubie.com/document/d/123456';
                    secure.redirectSec(req, {
                        redirect: function (where) {
                            assert.equal(where, res);
                            callback();
                        }
                    }, function () {
                        throw new Error('next should not be called');
                    });
                },
                function (callback) {
                    var req = {
                        headers: {'x-forwarded-proto': 'http', 'host': 'www.qubie.com'},
                        path: '/'
                    };
                    var res = 'https://www.qubie.com/';
                    secure.redirectSec(req, {
                        redirect: function (where) {
                            assert.equal(where, res);
                            callback();
                        }
                    }, function () {
                        throw new Error('next should not be called');
                    });
                }
            ], function () {
                done();
            });
        });
        it('should do nothing when accessed through https', function (done) {
            var req = {
                headers: {'x-forwarded-proto': 'https', 'host': 'www.qubie.com'},
                path: '/'
            };
            secure.redirectSec(req, {
                redirect: function () {
                    throw new Error('it should not redirect');
                }
            }, function () {
                done();
            });
        });
    });

    describe('#hashPassword', function () {
        it('should hash password and then call "next"', function (done) {
            secure.hashPassword("password", function (err, obtained_hash) {
                bcrypt.compare("password", obtained_hash, function (err, res) {
                    assert.equal(err, null);
                    assert.equal(res, true);
                    done();
                });
            });
        });
    });

    describe('#createLocalStrategyVerify', function () {
        it('should return user when correct password is provided', function (done) {
            bcrypt.hash("password", 10, function (err, hashed_password) {
                var db = createDummyDb("user", hashed_password, false, false);
                var strategy = secure.createLocalStrategyVerify(db);
                strategy("user", "password", function (err, result) {
                    assert.equal(err, null);
                    assert.deepEqual(result, {id: user_id, name: "user", password: hashed_password});
                    done();
                });
            });
        });

        it('should return false as second argument when bad password was provided', function (done) {
            bcrypt.hash("password", 10, function (err, hashed_password) {
                var db = createDummyDb("user", hashed_password, false, false);
                var strategy = secure.createLocalStrategyVerify(db);
                strategy("user", "bad_password", function (err, result) {
                    assert.equal(err, null);
                    assert.equal(result, false);
                    done();
                });
            });
        });

        it('should return false when given user was not found', function (done) {
            var db = createDummyDb(null, null, true, false);
            var strategy = secure.createLocalStrategyVerify(db);
            strategy("user", "password", function (err, result) {
                assert.equal(err, null);
                assert.equal(result, false);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb(null, null, false, true);
            var strategy = secure.createLocalStrategyVerify(db);
            strategy("user", "password", function (err, result) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#createSerializeUser', function () {
        it('should serialize user - return id of that user', function (done) {
            bcrypt.hash("password", 10, function (err, hashed_password) {
                var db = createDummyDb("user", hashed_password, false, false);
                var strategy = secure.createLocalStrategyVerify(db);
                var serialize = secure.createSerializeUser(db);
                strategy("user", "password", function (err, user) {
                    serialize(user, function (err, result) {
                        assert.equal(err, null);
                        assert.equal(result, user_id);
                        done();
                    });
                });
            });
        });
    });

    describe('#createDeserializeUser', function () {
        it('should return user object from database', function (done) {
            var db = createDummyDb("user", "password", false, false);
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, user) {
                assert.equal(err, null);
                assert.deepEqual(user, {id: user_id, name: "user", password: "password"});
                done();
            });
        });

        it('should return error when user was not found', function (done) {
            var db = createDummyDb(null, null, true, false);
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, user) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb(null, null, false, true);
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, user) {
                assert(err instanceof Error);
                done();
            });
        });
    });
});
