var sio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var AWS = require('aws-sdk');

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

function rootComm(socket, data, db, memstore) {
    db.Document.find(data.document).success(function (document) {
        document.getUser().success(function (result) {
            if (result.id === socket.request.user.id) {
                var online_id = document.id + ":online";
                socket.join(online_id);
                memdb.incrOnline(memstore, document.id, function (count) {
                    io.to(online_id).emit('count', {id: document.id, count: count});
                });

                socket.join(document.id);
                socket.join(document.id + ":deleted");

                socket.on('disconnect', function () {
                    memdb.decrOnline(memstore, document.id, function (count) {
                        io.to(online_id).emit('count', {id: document.id, count: count});
                    });
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
}

function listerComm(socket, data, db, memstore, s3bucket) {
    socket.request.user.getDocuments().success(function (documents) {
        documents.forEach(function (document) {
            socket.join(document.id + ":online");
            memdb.getOnline(memstore, document.id, function (count) {
                socket.emit('count', {id: document.id, count: count});
            });
        });
    });
    socket.on('delete', function (document_id) {
        db.Document.find(document_id).success(function (document) {
            document.getUser().success(function (result) {
                if (result.id === socket.request.user.id) {
                    s3bucket.deleteObject({Key: document.key}, function (err, data) {
                        if (err) {
                            console.error("Err when deleting s3 object:", err);
                        }
                        document.destroy().success(function () {
                            socket.emit('deleted', document_id);
                            io.to(document_id + ":deleted").emit("deleted");
                            // TODO: nejdriv nejak odpojit ostatni, taky mozna broadcastit do jinych kanalu?
                        });
                    });
                }
            });
        });
    });
}

module.exports.init = function (server, config, db, memstore, sessionStore) {
    io = sio(server);
    var s3bucket = new AWS.S3({params: {Bucket: config.aws_bucket}});

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
                rootComm(socket, data, db, memstore);
                break;
            case 'presenter':
                break;
            case 'viewer':
                break;
            case 'lister':
                listerComm(socket, data, db, memstore, s3bucket)
                break;
            }
        });
    });
};