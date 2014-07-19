var sio = require('socket.io');

var io;

module.exports.init = function (server, db, memstore) {
    io = sio(server);

    io.use(function (socket, next) {
        var handshakeData = socket.request;
        next();
    });
    io.on('connection', function (socket) {
        socket.on('device', function (device) {
            // TODO: mozna pdf vs png?
            if (device === 'root') {
                socket.on('document', function (ID) {
                    // TODO: check opravneni
                    socket.join(ID);
                    // TODO: mozna vysoupnout existujici rooty?
                    // TODO: check ID regexpem
                    var documentID = "document:" + ID;

                });
            } else if (device === 'presenter') {

            } else if (device === 'viewer') {

            } else {
                console.log('Got unauthorized connection where "device" is: ' + device);
            }
        });
    });
};