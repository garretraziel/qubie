/** @module qb/app */

var http = require('http');
var https = require('https');
var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var errorhandler = require('errorhandler');

var configuration = require('./configuration');
var secure = require('./lib/secure');
var bcomm = require('./lib/browser_c11n');

var mainRouter = require('./routes/index');

var app = express();
var config = configuration[app.get('env')];
var server;
var sessionStore = new RedisStore(config.redisSessionStoreConfig);

if (config.reverse_proxy) {
    app.enable('trust proxy');
}
app.set('view engine', 'jade');
app.use(secure.redirectSec);
app.use(favicon(__dirname + '/public/favicon.png'));
app.use(cookieParser(config.secret));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({store: sessionStore, secret: config.secret,
    cookie: {secure: true}, proxy: true, resave: true, saveUninitialized: true}));
app.use(express.static(__dirname + '/public'));

app.get('/', mainRouter);

module.exports.run = function () {
    if (config.ssl) {
        server = https.createServer(config.options, app);
    } else {
        server = https.createServer(app);
    }

    bcomm.init(server);

    server.listen(config.port, config.host, function () {
        console.log("App is running on " + config.host + " port " + config.port);
    });
};