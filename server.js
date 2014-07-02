/**
 * @file Main server file for QB project.
 * @author Jan Sedlak
 */

// std modules
var http = require("http");
var https = require("https");

// installed modules
var express = require("express");

var app = express();

app.get('/', function (req, res) {
    res.send('Hello, world!');
});

app.listen(3000);