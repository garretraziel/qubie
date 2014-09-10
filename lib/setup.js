var path = require('path');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorhandler = require('errorhandler');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var csrf = require('csurf');

var createMainRouter = require('../routes/index');
var createUserRouter = require('../routes/user');
var createTeamRouter = require('../routes/team');
var createDocumentRouter = require('../routes/document');

var secure = require('./secure');
var admin = require('./admin');

module.exports.settings = function (app, config, db, sessionStore) {
    if (config.reverse_proxy) {
        app.enable('trust proxy');
    }
    app.set('view engine', 'jade');
    app.set('views', config.views);

    app.use(secure.redirectSec);
    app.use(cookieParser(config.secret));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(session({
        store: sessionStore,
        secret: config.secret,
        cookie: {secure: true},
        proxy: true,
        resave: true,
        saveUninitialized: true
    }));

    app.use(csrf());
    app.use(function (req, res, next) {
        res.locals.csrftoken = req.csrfToken();
        res.locals.csrf_url = encodeURIComponent(res.locals.csrftoken);
        next();
    });

    passport.use(new LocalStrategy(secure.createLocalStrategyVerify(db)));
    passport.serializeUser(secure.createSerializeUser(db));
    passport.deserializeUser(secure.createDeserializeUser(db));
    app.use(passport.initialize());
    app.use(passport.session());

    admin.init(app, config, db);

    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/bower_components', express.static(path.join(__dirname, '../bower_components')));

    if (app.get('env') === "development") {
        app.use(errorhandler());
        app.locals.pretty = true;
    }
};

module.exports.routes = function (app, config, db, memstore) {
    app.use(secure.authenticated);
    app.use('/', createMainRouter(config, db, passport));
    app.use('/user', createUserRouter(config, db, memstore));
    app.use('/document', createDocumentRouter(config, db, memstore));
    app.use('/admin', admin.adminRouter);
    app.use('/team', createTeamRouter(config, db, memstore));
    app.use(function (req, res, next) {
        res.status(404);
        res.render('404');
    });
};