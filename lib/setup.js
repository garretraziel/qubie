"use strict";

var fs = require('fs');
var path = require('path');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorhandler = require('errorhandler');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var csrf = require('csurf');
var morgan = require('morgan');
var winston = require('winston');
var AWS = require('aws-sdk');

var createMainRouter = require('../routes/index');
var createUserRouter = require('../routes/user');
var createTeamRouter = require('../routes/team');
var createDocumentRouter = require('../routes/document');
var createAdminRouter = require('../routes/admin');

var secure = require('./secure');

module.exports.settings = function (app, config, db, sessionStore) {
    if (config.file_log_output) {
        winston.remove(winston.transports.Console);
        winston.add(winston.transports.File, {filename: config.system_log_file});
    }

    if (config.reverse_proxy) {
        app.enable('trust proxy');
    }
    app.set('view engine', 'jade');
    app.set('views', config.views);

    if (config.log_access) {
        var accessLogStream = fs.createWriteStream(config.access_log_file);
        app.use(morgan('combined', {stream: accessLogStream}));
    }

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
    passport.serializeUser(secure.serializeUser);
    passport.deserializeUser(secure.createDeserializeUser(db));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/bower_components', express.static(path.join(__dirname, '../bower_components')));

    if (app.get('env') === "development") {
        app.use(errorhandler());
        app.locals.pretty = true;
    }
};

module.exports.routes = function (app, config, db, memstore) {
    var s3bucket = new AWS.S3({params: {Bucket: config.aws_bucket}});

    app.use(secure.authenticated);
    app.use(secure.administrator);
    app.use('/', createMainRouter(config, db, passport));
    app.use('/user', createUserRouter(config, db, memstore, s3bucket));
    app.use('/document', createDocumentRouter(config, db, memstore));
    app.use('/admin', createAdminRouter(config, db, s3bucket));
    app.use('/team', createTeamRouter(config, db, memstore));
    app.use(function (req, res, next) {
        res.status(404);
        res.render('404');
    });
};
