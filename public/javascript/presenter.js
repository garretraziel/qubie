var socket = io();

$(document).ready(function () {
    $("#sendbtn").on('click', function () {
        socket.emit('join', {role: "presenter", document: ID});
        socket.emit('auth', $("#nameinp").val());
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