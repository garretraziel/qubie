var events = require('events');
var url = require('url');
var async = require('async');
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
    async.waterfall([
        function (callback) {
            db.Document.find(data.document).success(function (document) {
                callback(null, document);
            }).error(function (err) {
                callback(err);
            });
        },
        function (document, callback) {
            document.getUser().success(function (result) {
                callback(null, document, result);
            }).error(function (err) {
                callback(err);
            });
        },
        function (document, result, callback) {
            if (result.id === socket.request.user.id) {
                callback(null, document);
            } else {
                callback(new Error('Unauthenticated user ' + socket.request.user.id +  ' tyring to control file'));
            }
        },
        function (document, callback) {
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

            callback(null);
        }
    ], function (err) {
        if (err !== null) {
            console.error(err);
        }
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
    }).error(function (err) {
        console.err('Error during getting documents from db for user ' + socket.request.user.id + ':', err);
    });
    socket.on('delete', function (document_id) {
        async.waterfall([
            function (callback) {
                db.Document.find(document_id).success(function (document) {
                    callback(null, document);
                }).error(function (err) {
                    callback(err);
                });
            },
            function (document, callback) {
                document.getUser().success(function (result) {
                    callback(null, document, result);
                }).error(function (err) {
                    callback(err);
                });
            },
            function (document, result, callback) {
                if (result.id === socket.request.user.id) {
                    callback(null, document, result);
                } else {
                    callback(new Error('User ' + socket.request.user.id + ' is trying to delete not his own file.'));
                }
            },
            function (document, result, callback) {
                s3bucket.deleteObject({Key: document.key}, function (err, data) {
                    if (err !== null) {
                        callback(err);
                    } else {
                        callback(null, document, data);
                    }
                });
            },
            function (document, data, callback) {
                document.destroy().success(function () {
                    socket.emit('deleted', document_id);
                    io.to(document_id + ":deleted").emit("deleted");
                    // TODO: nejdriv nejak odpojit ostatni, taky mozna broadcastit do jinych kanalu?
                    callback();
                }).error(function (err) {
                    callback(err);
                });
            }
        ], function (err) {
            if (err !== null) {
                console.error(err);
            }
        });
    });
}

function presenterComm(socket, data, db, memstore) {
    async.waterfall([
        function (callback) {
            memdb.getPresenterId(memstore, data.pres_id, function (doc_id) {
                callback(null, doc_id);
            });
        },
        function (doc_id, callback) {
            if (doc_id !== false) {
                memdb.presenterEnabled(memstore, doc_id, function (result) {
                    callback(null, doc_id, result);
                });
            } else {
                callback(new Error('User is trying to connect to document without presenter enabled.'));
            }
        },
        function (doc_id, result, callback) {
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

                callback(null);
            }
        }
    ], function (err) {
        if (err !== null) {
            console.error(err);
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