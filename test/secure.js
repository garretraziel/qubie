var assert = require('assert');
var async = require('async');
var bcrypt = require('bcrypt');

var secure = require('../lib/secure');

describe('secure', function () {
    var user_id = 123;
    function createDummyDb(inserted_object, errs) {
        var update_function = function (updated, what) {
            var len = what.length;
            for (var i = 0; i < len; i++) {
                this[what[i]] = updated[what[i]];
            }
            return this;
        };
        var find_function = function () {
            return {
                updateAttributes: update_function,
                success: function (done) {
                    if (!errs.iserror_find) {
                        if (errs.isnull) {
                            done(null);
                        } else {
                            for (var key in inserted_object) {
                                if (inserted_object.hasOwnProperty(key)) {
                                    this[key] = inserted_object[key];
                                }
                            }
                            done(this);
                        }
                    }
                    return {
                        error: function (done) {
                            if (errs.iserror_find) {
                                done(new Error('Error during reading from db'));
                            }
                        }
                    };
                }
            };
        };
        var create_function = function (options) {
            if (!errs.iserror_create) {
                for (var key in options) {
                    if (options.hasOwnProperty(key)) {
                        this[key] = options[key];
                    }
                }
            }
            return {
                success: function (done) {
                    if (!errs.iserror_create) {
                        done();
                    }
                    return {
                        error: function (done) {
                            if (errs.iserror_create) {
                                done(new Error('Error during writing to db'));
                            }
                        }
                    }
                }
            };
        };
        var user_object = {
            find: find_function,
            create: create_function
        };
        return {
            User: user_object
        };
    }
    var createUser = function (password) {
        return {
            id: user_id,
            username: "user",
            password: password
        };
    };

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
                bcrypt.compare("password", obtained_hash, function (err, result) {
                    assert.equal(err, null);
                    assert.equal(result, true);
                    done();
                });
            });
        });
    });

    describe('#createLocalStrategyVerify', function () {
        it('should return user when correct password is provided', function (done) {
            bcrypt.hash("password", 10, function (err, hashed_password) {
                var user = createUser(hashed_password);
                var db = createDummyDb(user, {});
                var strategy = secure.createLocalStrategyVerify(db);
                strategy("user", "password", function (err, result) {
                    assert.equal(err, null);                    
                    assert.equal(result.id, user.id);
                    assert.equal(result.username, user.username);
                    assert.equal(result.password, user.password);
                    done();
                });
            });
        });

        it('should return false as second argument when bad password was provided', function (done) {
            bcrypt.hash("password", 10, function (err, hashed_password) {
                var user = createUser(hashed_password);
                var db = createDummyDb(user, {});
                var strategy = secure.createLocalStrategyVerify(db);
                strategy("user", "bad_password", function (err, result) {
                    assert.equal(err, null);
                    assert.equal(result, false);
                    done();
                });
            });
        });

        it('should return false when given user was not found', function (done) {
            var db = createDummyDb({}, {isnull: true});
            var strategy = secure.createLocalStrategyVerify(db);
            strategy("user", "password", function (err, result) {
                assert.equal(err, null);
                assert.equal(result, false);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb({}, {iserror_find: true});
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
                var user = createUser(hashed_password);
                var db = createDummyDb(user, {});
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
            var user = createUser("password");
            var db = createDummyDb(user, {});
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, result) {
                assert.equal(err, null);
                assert.equal(result.id, user.id);
                assert.equal(result.username, user.username);
                assert.equal(result.password, user.password);
                done();
            });
        });

        it('should return error when user was not found', function (done) {
            var db = createDummyDb({}, {isnull: true});
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, result) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb({}, {iserror_find: true});
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, user) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#createUser', function () {
        it('should create user with provided arguments', function (done) {
            var db = createDummyDb({}, {isnull: true});
            var args = {
                username: "user",
                password: "password",
                email: "user@example.com",
                premium: undefined,
                admin: true,
                quota: 1234
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert.equal(err, null);
                assert.equal(db.User.username, "user");
                assert.equal(db.User.email, "user@example.com");
                assert.equal(db.User.premium, false);
                assert.equal(db.User.admin, true);
                assert.equal(db.User.quota, 1234);
                assert.equal(db.User.used_space, 0);
                bcrypt.compare("password", db.User.password, function (err, result) {
                    assert.equal(result, true);
                    done();
                });
            });
        });

        it('should use correct values from form and also default quota when quota is not provided', function (done) {
            var db = createDummyDb({}, {isnull: true});
            var args = {
                username: "user",
                password: "password",
                email: "",
                premium: undefined,
                admin: true
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert.equal(err, null);
                assert.equal(db.User.username, "user");
                assert.equal(db.User.email, null);
                assert.equal(db.User.premium, false);
                assert.equal(db.User.admin, true);
                assert.equal(db.User.quota, 4321);
                done();
            });
        });

        it('should not create user without password or username', function (done) {
            async.parallel([
                function (callback) {
                    var db = createDummyDb({}, {isnull: true});
                    var args = {
                        username: "user"
                    };
                    secure.createUser({default_quota: 4321}, db, args, function (err) {
                        assert(err instanceof Error);
                        callback();
                    });
                },
                function (callback) {
                    var db = createDummyDb({}, {isnull: true});
                    var args = {
                        password: "password"
                    };
                    secure.createUser({default_quota: 4321}, db, args, function (err) {
                        assert(err instanceof Error);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return error when user exists', function (done) {
            var user = createUser("password");
            var db = createDummyDb(user, {});
            var args = {
                username: "user",
                password: "password",
                email: "user@example.com",
                premium: undefined,
                admin: true,
                quota: 1234
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during searching db', function (done) {
            var db = createDummyDb({}, {iserror_find: true});
            var args = {
                username: "user",
                password: "password",
                email: "user@example.com",
                premium: undefined,
                admin: true,
                quota: 1234
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during saving to db', function (done) {
            var db = createDummyDb({}, {isnull: true, iserror_create: true});
            var args = {
                username: "user",
                password: "password",
                email: "user@example.com",
                premium: undefined,
                admin: true,
                quota: 1234
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#changeUser', function () {
        it('should change user attributes', function (done) {
            var user = {
                username: "user",
                password: "password",
                email: "user@example.com",
                premium: true,
                admin: false,
                quota: 1234,
                used_space: 0
            };
            var db = createDummyDb(user, {});
            secure.changeUser(db, {
                database_id: user_id,
                password: "",
                premium: undefined,
                email: "user@user.com",
                quota: 4321
            }, function (err) {
                assert.equal(err, null);
                assert.equal(db.User.username, "user");
                assert.equal(db.User.password, "password");
                assert.equal(db.User.email, "user@user.com");
                assert.equal(db.User.premium, false);
                assert.equal(db.User.admin, false);
                assert.equal(db.User.quota, 4321);
                assert.equal(db.User.used_space, 0);
                done();
            });
        });
    });
});