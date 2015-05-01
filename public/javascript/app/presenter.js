"use strict";

/*global pres_id*/

define(function (require) {
    var $ = require('jquery');
    var io = require('socketio');
    var vex = require('vex');
    var vexdialog = require('vexdialog');
    var FastClick = require('fastclick');
    var pdf = require('pdf_viewer');
    var Hammer = require('hammerjs');
    var socket = io();

    var canvas = document.getElementById('cnvs');
    var jq_canvas = $("#cnvs");
    var context = canvas.getContext('2d');
    canvas.width = jq_canvas.width();
    canvas.height = jq_canvas.height();
    var pdfViewer = new pdf.PdfViewer(jq_canvas);
    var hammertime = new Hammer(canvas);

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
        vexdialog.alert("Connected.");
    });
    socket.on('page', function (pagenum) {
        pdfViewer.setPage(pagenum);
    });
    socket.on('document_url', function (docURL) {
        pdfViewer.loadDocument(docURL);
    });

    FastClick.attach(document.body);
    
    hammertime.on('swiperight', function () {
        socket.emit('page', pdfViewer.decPage());
    });
    
    hammertime.on('swipeleft', function () {
        socket.emit('page', pdfViewer.incPage());
    });

    $(document).ready(function () {
        $("#leftbtn").on('click', function () {
            socket.emit('page', pdfViewer.decPage());
        });

        $("#rightbtn").on('click', function () {
            socket.emit('page', pdfViewer.incPage());
        });

        $(window).resize(function () {
            canvas.width = jq_canvas.width();
            canvas.height = jq_canvas.height();
            pdfViewer.rerender();
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
