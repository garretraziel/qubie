/**
 * @file Main server file for QB project.
 * @author Jan Sedlak
 */

"use strict";

var http = require('http');
var https = require('https');
var express = require('express');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var winston = require('winston');

var configuration = require('./configuration/configuration');
var setup = require('./lib/setup');
var bc11m = require('./lib/bc11n');
var memdb = require('./lib/memdb');
var drawdb = require('./lib/drawdb');
var models = require('./models');

var app = express();
var config = configuration[app.get('env')];
var db = models(config);
var memstore = memdb.init(config);
var drawstore = drawdb.init(config);
var server;

function runServer(err) {
    if (err) {
        // err is array of three errors
        winston.error('during syncing database:', err[0]);
        return process.exit(1);
    }

    var sessionStore = new RedisStore({client: memstore});

    setup.settings(app, config, db, sessionStore);
    setup.routes(app, config, db, memstore);

    if (config.ssl) {
        server = https.createServer(config.options, app);
    } else {
        server = http.createServer(app);
    }

    bc11m.init(server, config, db, memstore, sessionStore, drawstore);

    server.listen(config.port, function () {
        winston.info("app is running on port %d", config.port);
    });
}

db.sequelize.sync().complete(runServer);
