var events = require('events');
var url = require('url');
var sio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var AWS = require('aws-sdk');

var memdb = require('./memdb');
var secure = require('./secure');

var io;
var authEmitters = {};
var controlEmitters = {};

function onAuthorizeSuccess(data, accept) {
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) {
        console.error(message);
    }
    accept(null, !error);
}

function rootComm(socket, data, db, memstore, config) {
    db.Document.find(data.document).success(function (document) {
        document.getUser().success(function (result) {
            if (result.id === socket.request.user.id) {
                authEmitters[document.id] = new events.EventEmitter(); // TODO: nove?
                authEmitters[document.id].setMaxListeners(0);
                controlEmitters[document.id] = new events.EventEmitter();
                controlEmitters[document.id].setMaxListeners(0);

                var authEmitter = authEmitters[document.id];
                var controlEmitter = controlEmitters[document.id];

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
                    delete authEmitters[document.id];
                    delete controlEmitters[document.id];
                    memdb.disablePresenter(memstore, document.id);
                });

                memdb.getPage(memstore, document.id, 1, function (page) {
                    socket.emit('page', page);
                });

                socket.on('page', function (page) {
                    socket.to(document.id).emit('page', page);
                    memdb.putPage(memstore, document.id, page);
                });

                socket.on('enable_presenter', function (enable) {
                    if (enable === true) {
                        memdb.enablePresenter(memstore, document.id, function (id) {
                            var pres_url = url.resolve(config.link_url, '/document/p/' + id);
                            socket.emit('presenter_url', pres_url);
                        });
                    } else {
                        memdb.disablePresenter(memstore, document.id);
                    }
                });

                secure.bindPAuthRoot(socket, authEmitter, controlEmitter, document.id, function () {
                    console.log("root: presenter authenticated");
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

function presenterComm(socket, data, db, memstore) {
    memdb.getPresenterId(memstore, data.pres_id, function (doc_id) {
        if (doc_id !== false) {
            memdb.presenterEnabled(memstore, doc_id, function (result) {
                if (result === true) {
                    var authEmitter = authEmitters[doc_id];
                    var controlEmitter = controlEmitters[doc_id];

                    secure.bindPAuth(socket, authEmitter, controlEmitter, doc_id, function () {
                        console.log("presenter authenticated");
                        socket.join(doc_id);

                        memdb.getPage(memstore, doc_id, 1, function (page) {
                            socket.emit('page', page);
                        });

                        socket.on('page', function (page) {
                            socket.to(doc_id).emit('page', page);
                            memdb.putPage(memstore, doc_id, page);
                        });
                    });
                }
            });
        }
    });
}

function viewerComm(socket, data, db, memstore) {

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
        socket.on('join', function (data) { // TODO: once?
            switch (data.role) {
            case 'root':
                if (socket.request.user.logged_in === false) {
                    console.log('Got unlogged user request for socket.io root communication.');
                } else {
                    rootComm(socket, data, db, memstore, config);
                }
                break;
            case 'presenter':
                presenterComm(socket, data, db, memstore);
                break;
            case 'viewer':
                viewerComm(socket, data, db, memstore);
                break;
            case 'lister':
                if (socket.request.user.logged_in === false) {
                    console.log('Got unlogged user request for socket.io lister communication.');
                } else {
                    listerComm(socket, data, db, memstore, s3bucket);
                }
                break;
            }
        });
    });
};