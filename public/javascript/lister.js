var socket = io();

$(document).ready(function () {
    socket.emit('join', {role: "lister"});
    socket.on('count', function (data) {
        $("#" + data.id + "_counter").text(data.count);
    });
    socket.on('deleted', function (document_id) {
        $("#" + document_id + "_item").remove();
    });
    $('.deleter').click(function () {
        socket.emit('delete', $(this).attr("document"));
    });
});