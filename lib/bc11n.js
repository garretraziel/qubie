var sio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');

var io;

function onAuthorizeSuccess(data, accept) {
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) {
        console.error(message);
    }
    console.log('Failed socket.io passport auth:', message);
    accept(null, false);
}

module.exports.init = function (server, config, db, memstore, sessionStore) {
    io = sio(server);

    io.use(passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: 'connect.sid',
        secret: config.secret,
        store: sessionStore,
        success: onAuthorizeSuccess,
        fail: onAuthorizeFail
    }));
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