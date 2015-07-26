"use strict";

var bcrypt = require('bcrypt');
var winston = require('winston');

function redirectSec(req, res, next) {
    if (req.headers['x-forwarded-proto'] === 'http') {
        res.redirect('https://' + req.headers.host + req.path);
    } else {
        return next();
    }
}

function hashPassword(password, next) {
    bcrypt.hash(password, 10, function (err, hash) {
        if (err) {
            winston.error('during hashing password: %s', String(err));
        }
        next(err, hash);
    });
}

function createLocalStrategyVerify(db) {
    return function (username, password, done) {
        db.User.find({where: {username: username}}).then(function (user) {
            if (user !== null) {
                bcrypt.compare(password, user.password, function (err, res) {
                    if (err) {
                        winston.error('during password comparison: %s', String(err));
                        return done(err);
                    }
                    if (res === true) {
                        return done(null, user);
                    }
                    return done(null, false, {message: 'Incorrect user or password.'});
                });
            } else {
                return done(null, false, {message: 'Incorrect user or password.'});
            }
        }).catch(function (err) {
            winston.error('during database read: %s', String(err));
            return done(err);
        });
    };
}

function createSerializeUser(db) {
    return function (user, done) {
        done(null, user.id);
    };
}

function createDeserializeUser(db) {
    return function (id, done) {
        db.User.findById(id).then(function (user) {
            if (user !== null) {
                done(null, user);
            } else {
                winston.error("during user retrieval: nonexistent id %d", id);
                done(new Error("Nonexistent user"));
            }
        }).catch(function (err) {
            winston.error("with database during user retrieval: %s", String(err));
            done(err);
        });
    };
}

function resolveBodyValue(value) {
    if (value === null || value === undefined) {
        return false;
    }
    if (value === "") {
        return null;
    }
    return value;
}

function createUser(config, db, args, done) {
    if (!args.username || !args.password) {
        return done(new Error("Username and password are required in user account"));
    }
    db.User.find({where: {username: args.username}}).then(function (user) {
        if (user === null) {
            hashPassword(args.password, function (err, hash) {
                if (err) {
                    return done(err);
                }
                db.User.create({
                    username: resolveBodyValue(args.username),
                    password: hash,
                    email: resolveBodyValue(args.email), // TODO: co kdyz neni zadan email? nastavi se na false
                    premium: resolveBodyValue(args.premium), // TODO: neni premium_to
                    admin: resolveBodyValue(args.admin),
                    quota: resolveBodyValue(args.quota) || config.default_quota
                }).then(function () {
                    done(null);
                }).catch(function (err) {
                    winston.error("during saving user: %s", String(err));
                    done(new Error("Cannot create user in database"));
                });
            });
        } else {
            done(new Error("User already exists"));
        }
    }).catch(function (err) {
        winston.error("with database during user creation: %s", String(err));
        done(err);
    });
}

function changeUser(db, args, done) {
    if (!args.database_id) {
        return done(new Error('Database_id should be provided in arguments'));
    }
    db.User.find(args.database_id).then(function (user) {
        if (user === null) {
            done(new Error('Trying to edit non-existent user: ' + args.database_id));
        } else {
            var updated = {};
            var to_update = ["username", "email", "premium", "premium_to", "admin", "quota"];
            to_update.forEach(function (item) {
                updated[item] = resolveBodyValue(args[item]);
            });
            if (args.password !== "") {
                hashPassword(args.password, function (err, hash) {
                    if (err) {
                        return done(err);
                    }
                    updated.password = hash;
                    to_update.push("password");
                    user.updateAttributes(updated, to_update).then(function () {
                        done(null);
                    }).catch(function (err) {
                        winston.error('during updating attributes: %s', String(err));
                        done(err);
                    });
                });
            } else {
                user.updateAttributes(updated, to_update).then(function () {
                    done(null);
                }).catch(function (err) {
                    winston.error('during updating attributes: %s', String(err));
                    done(err);
                });
            }
        }
    }).catch(function (err) {
        winston.error('during changing user in db: %s', String(err));
        return done(err);
    });
}

function authenticated(req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.logged_in = true;
        res.locals.username = req.user.username;
    } else {
        res.locals.logged_in = false;
    }
    next();
}

function administrator(req, res, next) {
    if (req.isAuthenticated() && req.user.admin) {
        res.locals.admin = true;
    } else {
        res.locals.admin = false;
    }
    next();
}

function bindPAuthRoot(socket, authEmitter, controlEmitter, document_id, done) {
    authEmitter.on("request", function (request) {
        socket.emit("auth_request", request);
    });
    socket.on("auth_response", function (msg) {
        var response = {};
        if (msg.outcome === "ack" && msg.passwd !== null) {
            response.outcome = "ack";
            response.passwd = msg.passwd;
        } else {
            response.outcome = "nack";
        }
        authEmitter.emit("response:" + msg.name, response);
    });
    controlEmitter.on("authorized", done);
}

function bindPAuth(socket, authEmitter, controlEmitter, document_id, done) {
    socket.on('auth', function (name) { // TODO: once?
        // TODO: name musi byt unikatni
        var responseReact = function (response) {
            if (response.outcome === "ack") {
                var checkPassword = function (passwd) {
                    if (passwd === response.passwd) {
                        socket.emit("auth_completed");
                        controlEmitter.emit("authorized");
                        return done();
                    }
                    socket.emit('bad_password');
                };
                socket.on("auth_passwd", checkPassword); // TODO: neni tohle memory leak? mozna spis "once"
                socket.emit("auth_response", "ack");
            } else {
                socket.emit("auth_response", "nack");
            }
        };

        authEmitter.once("response:" + name, responseReact);

        socket.on('disconnect', function () {
            authEmitter.removeListener('response:' + name, responseReact);
        });

        authEmitter.emit("request", {name: name});
    });
}

module.exports = {
    redirectSec: redirectSec,
    createLocalStrategyVerify: createLocalStrategyVerify,
    createSerializeUser: createSerializeUser,
    createDeserializeUser: createDeserializeUser,
    createUser: createUser,
    changeUser: changeUser,
    hashPassword: hashPassword,
    authenticated: authenticated,
    bindPAuthRoot: bindPAuthRoot,
    bindPAuth: bindPAuth,
    administrator: administrator
};
