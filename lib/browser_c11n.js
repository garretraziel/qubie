var sio = require('socket.io');

var io;

module.exports.init = function (server) {
    io = sio(server);

    io.on('connection', function (socket) {
       // magic
    });
};