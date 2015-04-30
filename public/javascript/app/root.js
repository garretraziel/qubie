"use strict";

/* global ID */

define(function (require) {
    var $ = require('jquery');
    var io = require('socketio');
    var vex = require('vex');
    var vexdialog = require('vexdialog');
    var pdf = require('pdf_viewer');

    var socket = io();
    var canvas = document.getElementById('cnvs');
    var context = canvas.getContext('2d');
    var c_width = window.innerWidth;
    var c_height = window.innerHeight;
    canvas.width = c_width;
    canvas.height = c_height;
    var pdfViewer = new pdf.PdfViewer(canvas, URL);

    var pencil_color = "black";
    var pencil_width = 2;

    var presenter_url;
    var qrcode_url;

    vex.defaultOptions.className = 'vex-theme-plain';

    socket.on('page', function (page) {
        pdfViewer.setPage(page);
    });

    socket.on('connect', function () {
        socket.emit('join', {role: 'root', document: ID});
    });

    socket.on('auth_request', function (request) {
        vexdialog.open({
            // TODO: tady hrozi nejaky JavaScript injection
            message: "Presenter " + request.name + " connected. Password:",
            input: '<input name="passwd" type="password">',
            callback: function (data) {
                var response = {};
                response.name = request.name;
                if (data === false) {
                    response.outcome = "nack";
                    socket.emit('auth_response', response);
                } else {
                    response.outcome = "ack";
                    response.passwd = data.passwd;
                    socket.emit('auth_response', response);
                }
            }
        });
    });

    socket.on('presenter_url', function (url) {
        presenter_url = url;
        vexdialog.alert('Presenter url: ' + url);
    });

    socket.on('qrcode_url', function (url) {
        qrcode_url = url;
        vex.open({
            content: '<p>' + presenter_url + '</p><br/><img src="' + url + '">'
        });
    });

    socket.on('pencil_event', function (coordinates) {
        var from_x = c_width * coordinates.from[0];
        var from_y = c_height * coordinates.from[1];
        var to_x = c_width * coordinates.to[0];
        var to_y = c_height * coordinates.to[1];
        context.beginPath();
        context.moveTo(from_x, from_y);
        context.lineTo(to_x, to_y);
        context.strokeStyle = pencil_color;
        context.lineWidth = pencil_width;
        context.stroke();
        context.closePath();
    });

    $(document).ready(function () {
        pdfViewer.loadDocument();
        $(window).resize(function () {
            c_width = window.innerWidth;
            c_height = window.innerHeight;
            canvas.width = c_width;
            canvas.height = c_height;
            pdfViewer.rerender();
        });
        $("body").keydown(function (e) {
            if (e.which === 37) {
                socket.emit('page', pdfViewer.decPage());
            } else if (e.which === 39) {
                socket.emit('page', pdfViewer.incPage());
            }
        });
        $("#presenter").change(function () {
            socket.emit("enable_presenter", $(this).is(':checked'));
            if ($(this).is(':checked')) {
                $("#show_qr").removeAttr("disabled");
            } else {
                $("#show_qr").attr("disabled", true);
            }
        });
        $("#show_qr").on("click", function () {
            socket.emit("show_qr");
        });
        /*$("#cntrls").click(function () {
         $(this).animate({
         width: "100px",
         height: "200px"
         });
         });*/
    });
});
