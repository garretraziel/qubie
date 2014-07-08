var path = require('path');
var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var errorhandler = require('errorhandler');

var mainRouter = require('../routes/index');

var secure = require('./secure');

module.exports.settings = function (app, config) {
    var sessionStore = new RedisStore({url: config.redis_uri});

    if (config.reverse_proxy) {
        app.enable('trust proxy');
    }
    app.set('view engine', 'jade');
    app.set('views', config.views);

    app.use(secure.redirectSec);
    app.use(favicon(path.join(config.public, 'favicon.png')));
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
    app.use(express.static(path.join(__dirname, '../public')));

    if (app.get('env') === "development") {
        app.use(errorhandler());
    }
};

module.exports.routes = function (app, db, memstore) {
    app.use('/', mainRouter);
};