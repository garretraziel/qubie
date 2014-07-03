/** @module qb/app */

var http = require('http');
var https = require('https');
var express = require('express');

var configuration = require('./configuration');
var secure = require('./lib/secure');
var bcomm = require('./lib/browser_c11n');

var mainRouter = require('./routes/index');

var app = express();
var config = configuration[app.get('env')];
var server;

if (config.reverse_proxy) {
    app.enable('trust proxy');
}

app.all('*', secure.redirectSec);
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