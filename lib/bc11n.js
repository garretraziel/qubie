var sio = require('socket.io');

var io;

module.exports.init = function (server, db, memstore) {
    io = sio(server);

    io.use(function (socket, next) {
        var handshakeData = socket.request;
        next();
    });
    io.on('connection', function (socket) {
        socket.on('join', function (data) {
            switch (data.role) {
                case 'root':
                    break;
                case 'presenter':
                    break;
                case 'viewer':
                    break;
                case 'lister':
                    break;
            }
        });
    });
};