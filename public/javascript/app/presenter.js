define(function (require) {
    var $ = require('jquery'); require('jquerymobile');
    var io = require('socketio');
    var vex = require('vex');
    var vexdialog = require('vexdialog');
    var socket = io();
    var page;

    vex.defaultOptions.className = 'vex-theme-plain';

    $(document).ready(function () {
        $("#leftbtn").on('click', function () {
            if (page > 0) {
                page--;
                socket.emit('page', page);
            }
        });

        $("#rightbtn").on('click', function () {
            page++;
            socket.emit('page', page);
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
            vexdialog.alert('Your connection was not authorized by root viewer.')
        }
    });
    socket.on('auth_completed', function () {
        $("#leftbtn").removeAttr("disabled");
        $("#rightbtn").removeAttr("disabled");
    });
    socket.on('page', function (pagenum) {
        page = pagenum;
    });
    socket.on('document_url', function (doc_url) {
        vexdialog.alert(doc_url);
    });
});
