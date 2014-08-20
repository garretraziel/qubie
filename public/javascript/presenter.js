var socket = io();
var page;

$(document).ready(function () {
    $("#sendbtn").on('click', function () {
        socket.emit('join', {role: "presenter", document: ID});
        socket.emit('auth', $("#nameinp").val());
    });

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
});

socket.on('auth_response', function (outcome) {
    if (outcome === "ack") {
        console.log("acked");
        socket.emit("auth_passwd", "password");
    } else {
        console.log("nacked");
    }
});
socket.on('auth_completed', function () {
    console.log('OKAY!');
});
socket.on('page', function (pagenum) {
    page = pagenum;
});