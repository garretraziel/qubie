"use strict";

/*global pres_id*/

define(function (require) {
    var $ = require('jquery');
    var io = require('socketio');
    var vex = require('vex');
    var vexdialog = require('vexdialog');
    var FastClick = require('fastclick');
    var socket = io();
    var page;

//    var canvas = document.getElementById('cnvs');
//    var context = canvas.getContext('2d');
//    var c_width = window.innerWidth;
//    var c_height = window.innerHeight;
//    canvas.width = c_width;
//    canvas.height = c_height;

    vex.defaultOptions.className = 'vex-theme-plain';

    socket.on('connect', function () {
        socket.emit('join', {role: "presenter", pres_id: pres_id});
    });

    socket.on('auth_response', function (outcome) {
        if (outcome === "ack") {
            vexdialog.open({
                message: "Password:",
                input: '<input name="password" type="password">',
                callback: function (data) {
                    if (data !== false) {
                        socket.emit("auth_passwd", data.password);
                    }
                }
            });
        } else {
            vexdialog.alert('Your connection was not authorized by root viewer.');
        }
    });
    socket.on('bad_password', function () {
        vexdialog.open({
            message: "Bad password. Password:",
            input: '<input name="password" type="password">',
            callback: function (data) {
                if (data !== false) {
                    socket.emit("auth_passwd", data.password);
                }
            }
        });
    });
    socket.on('auth_completed', function () {
        //$("#leftbtn").removeAttr("disabled");
        //$("#rightbtn").removeAttr("disabled");
    });
    socket.on('page', function (pagenum) {
        page = pagenum;
    });
    socket.on('document_url', function (doc_url) {
        vexdialog.alert(doc_url);
    });

    FastClick.attach(document.body);

    $(document).ready(function () {
        $("#leftbtn").on('click', function () {
            if (page > 1) {
                page--;
                socket.emit('page', page);
            }
        });

        $("#rightbtn").on('click', function () {
            page++;
            socket.emit('page', page);
        });

        $(window).resize(function () {
//            c_width = window.innerWidth;
//            c_height = window.innerHeight;
//            canvas.width = c_width;
//            canvas.height = c_height;
        });

        $('#cnvs').mousedown(function (e) {
            //TODO: kresleni
        });

        vexdialog.open({
            message: "Your name:",
            input: '<input name="name" type="text">',
            callback: function (data) {
                if (data !== false) {
                    socket.emit('auth', data.name);
                }
            }
        });
    });
});
