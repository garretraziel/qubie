"use strict";

var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var bcrypt = require('bcrypt');
var createDummyDb = require('./utils/db');

var secure = require('../lib/secure');

describe('secure', function () {
    var user_id = 123;

    var createUser = function (password) {
        return {
            id: user_id,
            username: "user",
            password: password,
            email: "user@example.com",
            premium: true,
            admin: false,
            quota: 1234,
            used_space: function (d) {d(null, 0);}
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
                var db = createDummyDb(user, null, {});
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
                var db = createDummyDb(user, null, {});
                var strategy = secure.createLocalStrategyVerify(db);
                strategy("user", "bad_password", function (err, result) {
                    assert.equal(err, null);
                    assert.equal(result, false);
                    done();
                });
            });
        });

        it('should return false when given user was not found', function (done) {
            var db = createDummyDb({}, null, {isnull: true});
            var strategy = secure.createLocalStrategyVerify(db);
            strategy("user", "password", function (err, result) {
                assert.equal(err, null);
                assert.equal(result, false);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb({}, null, {iserror_find: true});
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
                var db = createDummyDb(user, null, {});
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
            var db = createDummyDb(user, null, {});
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
            var db = createDummyDb({}, null, {isnull: true});
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, result) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var db = createDummyDb({}, null, {iserror_find: true});
            var deserialize = secure.createDeserializeUser(db);
            deserialize(user_id, function (err, user) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#createUser', function () {
        it('should create user with provided arguments', function (done) {
            var db = createDummyDb({}, null, {isnull: true});
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
                assert.equal(db.User.created.username, "user");
                assert.equal(db.User.created.email, "user@example.com");
                assert.equal(db.User.created.premium, false);
                assert.equal(db.User.created.admin, true);
                assert.equal(db.User.created.quota, 1234);
                bcrypt.compare("password", db.User.created.password, function (err, result) {
                    assert.equal(result, true);
                    done();
                });
            });
        });

        it('should use correct values from form and also default quota when quota is not provided', function (done) {
            var db = createDummyDb({}, null, {isnull: true});
            var args = {
                username: "user",
                password: "password",
                email: "",
                premium: undefined,
                admin: true
            };
            secure.createUser({default_quota: 4321}, db, args, function (err) {
                assert.equal(err, null);
                assert.equal(db.User.created.username, "user");
                assert.equal(db.User.created.email, null);
                assert.equal(db.User.created.premium, false);
                assert.equal(db.User.created.admin, true);
                assert.equal(db.User.created.quota, 4321);
                done();
            });
        });

        it('should not create user without password or username', function (done) {
            async.parallel([
                function (callback) {
                    var db = createDummyDb({}, null, {isnull: true});
                    var args = {
                        username: "user"
                    };
                    secure.createUser({default_quota: 4321}, db, args, function (err) {
                        assert(err instanceof Error);
                        callback();
                    });
                },
                function (callback) {
                    var db = createDummyDb({}, null, {isnull: true});
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
            var db = createDummyDb(user, null, {});
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
            var db = createDummyDb({}, null, {iserror_find: true});
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
            var db = createDummyDb({}, null, {isnull: true, iserror_create: true});
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
            var db = createDummyDb(createUser("password"), null, {});
            secure.changeUser(db, {
                username: "user", //TODO: tohle oddelat, ale nejprve spravit v kodu
                database_id: user_id,
                password: "",
                premium: undefined,
                email: "user@user.com",
                quota: 4321
            }, function (err) {
                assert.equal(err, null);
                assert.equal(db.User.existing.username, "user");
                assert.equal(db.User.existing.password, "password");
                assert.equal(db.User.existing.email, "user@user.com");
                assert.equal(db.User.existing.premium, false);
                assert.equal(db.User.existing.admin, false);
                assert.equal(db.User.existing.quota, 4321);
                done();
            });
        });

        it('should change user password', function (done) {
            var db = createDummyDb(createUser("password"), null, {});
            secure.changeUser(db, {
                database_id: user_id,
                password: "new_password",
            }, function (err) {
                bcrypt.compare("new_password", db.User.existing.password, function (err, result) {
                    assert.equal(result, true);
                    done();
                });
            });
        });

        it('should return error when there was error during updating attributes', function (done) {
            async.parallel([
                function (callback) {
                    var user = createUser("password");
                    var db = createDummyDb(user, null, {iserror_update: true});
                    secure.changeUser(db, {
                        database_id: user_id,
                        email: "user@user.com"
                    }, function (err) {
                        assert(err instanceof Error);
                        callback();
                    });
                },
                function (callback) {
                    var user = createUser("password");
                    var db = createDummyDb(user, null, {iserror_update: true});
                    secure.changeUser(db, {
                        database_id: user_id,
                        email: "user@user.com",
                        password: "new_password"
                    }, function (err) {
                        assert(err instanceof Error);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return error when user account was not found', function (done) {
            var db = createDummyDb({}, null, {isnull: true});
            secure.changeUser(db, {
                database_id: user_id,
                email: "user@user.com"
            }, function (err) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when no database_id was provided', function (done) {
            var db = createDummyDb(createUser("password"), null, {});
            secure.changeUser(db, {
                email: "user@user.com"
            }, function (err) {
                assert(err instanceof Error);
                done();
            });
        });

        it('should return error when there was error during searching in db', function (done) {
            var db = createDummyDb(createUser("password"), null, {isfind_error: true});
            secure.changeUser(db, {
                database_id: user_id,
                email: "user@user.com"
            }, function (err) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#authenticated', function () {
        it('should add info about authenticated user to locals', function (done) {
            var req = {};
            req.isAuthenticated = function () {return true;};
            req.user = {username: 'user'};
            var res = {locals: {}};
            secure.authenticated(req, res, function () {
                assert.equal(res.locals.username, 'user');
                assert.equal(res.locals.logged_in, true);
                done();
            });
        });

        it('should set logged_in to false when user is not logged in', function (done) {
            var req = {};
            req.isAuthenticated = function () {return false;};
            var res = {locals: {}};
            secure.authenticated(req, res, function () {
                assert.equal(res.locals.logged_in, false);
                done();
            });
        });
    });

    describe('#bindPAuthRoot', function () {
        it('should handle websocket root authentication and call done() when done', function (done) {
            var socket = new EventEmitter();
            var authEmitter = new EventEmitter();
            var controlEmitter = new EventEmitter();
            var original_request = {name: "user"};
            var original_response = {outcome: "ack", name: "user", passwd: "password"};
            socket.on('auth_request', function (request) {
                assert.deepEqual(original_request, request);
                socket.emit('auth_response', original_response);
            });
            authEmitter.on('response:user', function (response) {
                assert.equal(response.outcome, "ack");
                assert.equal(response.passwd, original_response.passwd);
                controlEmitter.emit("authorized");
            });
            secure.bindPAuthRoot(socket, authEmitter, controlEmitter, null, done);
            authEmitter.emit('request', original_request);
        });

        it('should not call done() when user was not authenticated', function (done) {
            var socket = new EventEmitter();
            var authEmitter = new EventEmitter();
            var controlEmitter = new EventEmitter();
            var original_request = {name: "user"};
            var original_response = {outcome: "ack", name: "user", passwd: "password"};
            socket.on('auth_request', function (request) {
                assert.deepEqual(original_request, request);
                socket.emit('auth_response', original_response);
            });
            authEmitter.on('response:user', function (response) {
                assert.equal(response.outcome, "ack");
                assert.equal(response.passwd, original_response.passwd);
                done();
            });
            secure.bindPAuthRoot(socket, authEmitter, controlEmitter, null, function () {
                throw new Error("This function should not be called");
            });
            authEmitter.emit('request', original_request);
        });
    });

    describe('#bindPAuth', function () {
        it('should authenticate presenter and call done() when done', function (done) {
            var socket = new EventEmitter();
            var authEmitter = new EventEmitter();
            var controlEmitter = new EventEmitter();
            var authMessage = {outcome: "ack", passwd: "passwd"};
            var username = 'user';
            authEmitter.on('request', function (request) {
                assert.equal(request.name, username);
                authEmitter.emit('response:' + request.name, authMessage);
            });
            socket.on('auth_response', function (state) {
                assert.equal(state, "ack");
                socket.emit('auth_passwd', authMessage.passwd);
            });
            async.parallel([
                function (callback) {
                    socket.on('auth_completed', callback);
                },
                function (callback) {
                    controlEmitter.on('authorized', callback);
                },
                function (callback) {
                    secure.bindPAuth(socket, authEmitter, controlEmitter, null, callback);
                }
            ], function () {
                done();
            });
            socket.emit('auth', username);
        });

        it('should not call done() when presenter was rejected', function (done) {
            var socket = new EventEmitter();
            var authEmitter = new EventEmitter();
            var controlEmitter = new EventEmitter();
            var authMessage = {outcome: "nack"};
            var username = 'user';
            authEmitter.on('request', function (request) {
                assert.equal(request.name, username);
                authEmitter.emit('response:' + request.name, authMessage);
            });
            socket.on('auth_response', function (state) {
                assert.equal(state, "nack");
                done();
            });
            socket.on('auth_completed', function () {
                throw new Error("This function should not be called");
            });
            controlEmitter.on('authorized', function () {
                throw new Error("This function should not be called");
            });
            secure.bindPAuth(socket, authEmitter, controlEmitter, null, function () {
                throw new Error("This function should not be called");
            });
            socket.emit('auth', username);
        });

        it('should ask for password repeatedly when provided password was wrong', function (done) {
            var socket = new EventEmitter();
            var authEmitter = new EventEmitter();
            var controlEmitter = new EventEmitter();
            var authMessage = {outcome: "ack", passwd: "passwd"};
            var username = 'user';
            var retries = 0;
            var max_retries = 5;
            authEmitter.on('request', function (request) {
                assert.equal(request.name, username);
                authEmitter.emit('response:' + request.name, authMessage);
            });
            socket.on('auth_response', function (state) {
                assert.equal(state, "ack");
                socket.emit('auth_passwd', "badpassword");
            });
            socket.on('bad_password', function () {
                retries += 1;
                if (retries >= max_retries) {
                    socket.emit('auth_passwd', authMessage.passwd);
                } else {
                    socket.emit('auth_passwd', "badpassword");
                }
            });
            async.parallel([
                function (callback) {
                    socket.on('auth_completed', callback);
                },
                function (callback) {
                    controlEmitter.on('authorized', callback);
                },
                function (callback) {
                    secure.bindPAuth(socket, authEmitter, controlEmitter, null, callback);
                }
            ], function () {
                done();
            });
            socket.emit('auth', username);
        });
    });
});
