/**
 * @file Main server file for QB project.
 * @author Jan Sedlak
 */

var http = require('http');
var https = require('https');
var express = require('express');

var configuration = require('./configuration/configuration');
var setup = require('./lib/setup');
var bc11m = require('./lib/bc11n');
var memdb = require('./lib/memdb');
var models = require('./models');

var app = express();
var config = configuration[app.get('env')];
var db = models(config);

function runServer(app, config) {
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
}

db.sequelize.sync().complete(function (err) {
    if (err) {
        throw err[0];
    }
    runServer(app, config);
});