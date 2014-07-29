var sio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');

var memdb = require('./memdb');

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
        if (socket.request.user.logged_in === false) {
            console.log('Got unlogged user request for socket.io communication.');
            return;
        }
        socket.on('join', function (data) {
            switch (data.role) {
            case 'root':
                db.Document.find(data.document).success(function (document) {
                    document.getUser().success(function (result) {
                        if (result.id === socket.request.user.id) {
                            var online_id = document.id + ":online";
                            socket.join(online_id);
                            socket.to(online_id).emit('joined', document.id);
                            socket.join(document.id);
                            socket.on('disconnect', function () {
                                socket.to(online_id).emit('disconnected', document.id);
                            });
                            memdb.getPage(memstore, document.id, 1, function (page) {
                                socket.emit('page', page);
                            });
                            socket.on('page', function (page) {
                                socket.to(document.id).emit('page', page);
                                memdb.putPage(memstore, document.id, page);
                            });
                        }
                    });
                });
                break;
            case 'presenter':
                break;
            case 'viewer':
                break;
            case 'lister':
                socket.request.user.getDocuments().success(function (documents) {
                    documents.forEach(function (document) {
                        socket.join(document.id + ":online");
                    });
                });
                break;
            }
        });
    });
};