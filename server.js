/**
 * @file Main server file for QB project.
 * @author Jan Sedlak
 */

var http = require('http');
var https = require('https');
var express = require('express');

var configuration = require('./configuration');
var setup = require('./lib/setup');
var bc11m = require('./lib/bc11n');

var app = express();
var config = configuration[app.get('env')];
var server;

setup.settings(app, config);
setup.routes(app);

if (config.ssl) {
    server = https.createServer(config.options, app);
} else {
    server = http.createServer(app);
}

bc11m.init(server);

server.listen(config.port, function () {
    console.log("App is running on port " + config.port);
});
