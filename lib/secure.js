var bcrypt = require('bcrypt');

function redirectSec(req, res, next) {
    if (req.headers['x-forwarded-proto'] === 'http') {
        res.redirect('https://' + req.headers.host + req.path);
    } else {
        return next();
    }
}

function createLocalStrategyVerify(db) {
    return function (username, password, done) {
        db.User.find({where: {username: username}}).success(function (user) {
            if (user) {
                bcrypt.compare(password, user.password, function (err, res) {
                    if (res === true) {
                        return done(null, user);
                    }
                    return done(null, false, {message: 'Incorrect user or password.'});
                });
            } else {
                return done(null, false, {message: 'Incorrect user or password.'});
            }
        }).error(function (err) {
            console.error("Error with database: ", err);
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
        db.User.find(id).success(function (user) {
            if (user) {
                done(null, user);
            } else {
                console.error("Error during user retrieval: nonexistent id ", id);
                done(new Error("Nonexistent user"));
            }
        }).error(function (err) {
            console.error("Error with database during user retrieval: ", err);
            done(err);
        });
    };
}

function hashPassword(password, next) {
    bcrypt.hash(password, 10, function (err, hash) {
        if (err) throw err;
        next(hash);
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
        authEmitter.emit("request", {name: name});

        var responseReact = function (response) {
            if (response.outcome === "ack") {
                socket.emit("auth_response", "ack");
                socket.once("auth_passwd", function (passwd) {
                    if (passwd === response.passwd) {
                        socket.emit("auth_completed");
                        controlEmitter.emit("authorized");
                        done();
                    } else {
                        // TODO
                    }
                });
            } else {
                socket.emit("auth_response", "nack");
            }
        };

        authEmitter.once("response:" + name, responseReact);

        socket.on('disconnect', function () {
            authEmitter.removeListener('response:' + name, responseReact);
        });
    });
}

module.exports = {
    redirectSec: redirectSec,
    createLocalStrategyVerify: createLocalStrategyVerify,
    createSerializeUser: createSerializeUser,
    createDeserializeUser: createDeserializeUser,
    hashPassword: hashPassword,
    authenticated: authenticated,
    bindPAuthRoot: bindPAuthRoot,
    bindPAuth: bindPAuth
};