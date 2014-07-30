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
    socket.on('deleted', function (document_id) {
        $("#" + document_id + "_item").remove();
    });
    $('.deleter').click(function () {
        socket.emit('delete', $(this).attr("document"));
    });
});