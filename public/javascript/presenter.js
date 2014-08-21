var socket = io();
var page;

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

    vex.dialog.open({
        message: "Your name:",
        input: '<input name="name" type="text">',
        callback: function (data) {
            if (data !== false) {
                socket.emit('join', {role: "presenter", document: ID});
                socket.emit('auth', data.name);
            }
        }
    });
});

socket.on('auth_response', function (outcome) {
    if (outcome === "ack") {
        vex.dialog.open({
            message: "Password:",
            input: '<input name="password" type="password">',
            callback: function (data) {
                if (data !== false) {
                    socket.emit("auth_passwd", data.password);
                }
            }
        });
    } else {
        vex.dialog.alert('Your connection was not authorized by root viewer.')
    }
});
socket.on('auth_completed', function () {
    $("#leftbtn").removeAttr("disabled");
    $("#rightbtn").removeAttr("disabled");
});
socket.on('page', function (pagenum) {
    page = pagenum;
});