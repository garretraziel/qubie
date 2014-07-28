var socket = io();

$(document).ready(function () {
    socket.emit('join', {role: "lister"});
    socket.on('joined', function (document_id) {
        $("#" + document_id + "_counter").html(function (i, val) {
            return +val + 1;
        });
    });
    socket.on('disconnected', function (document_id) {
        $("#" + document_id + "_counter").html(function (i, val) {
            return +val - 1;
        });
    });
});