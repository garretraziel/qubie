"use strict";

var winston = require('winston');

before(function () {
    winston.remove(winston.transports.Console);
});
