var bcrypt = require('bcryptjs');

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

module.exports.redirectSec = redirectSec;
module.exports.createLocalStrategyVerify = createLocalStrategyVerify;
module.exports.createSerializeUser = createSerializeUser;
module.exports.createDeserializeUser = createDeserializeUser;
module.exports.hashPassword = hashPassword;
module.exports.authenticated = authenticated;