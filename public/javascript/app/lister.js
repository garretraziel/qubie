define(function (require) {
    var $ = require('jquery');
    var io = require('socketio');
    var socket = io();

    $(document).ready(function () {
        socket.emit('join', {role: "lister"});
        socket.on('count', function (data) {
            $("#" + data.id + "_counter").text(data.count);
        });
        socket.on('deleted', function (document_id) {
            $("#" + document_id + "_item").remove();
        });
        socket.on('used_space_update', function (used_space) {
            $("#used_space").text(used_space);
        });
        $('.deleter').click(function () {
            socket.emit('delete', $(this).attr("document"));
        });
    });
});
