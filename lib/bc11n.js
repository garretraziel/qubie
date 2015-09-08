"use strict";

var events = require('events');
var url = require('url');
var async = require('async');
var sio = require('socket.io');
var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var AWS = require('aws-sdk');
var winston = require('winston');

var memdb = require('./memdb');
var secure = require('./secure');
var filemgr = require('./filemgr');
var drawdb = require('./drawdb');

var io;
var authEmitters = {};
var controlEmitters = {};

function onAuthorizeSuccess(data, accept) {
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) {
        winston.error("during bc11n user authorization: %s", message);
    }
    accept(null, !error);
}

function rootComm(socket, data, db, memstore, drawstore, config) {
    async.waterfall([
        function (callback) {
            var document;
            db.Document.find(data.document).then(function (d) {
                if (d === null) {
                    throw "Document doesn't exist";
                }
                document = d;
                return d.getUser();
            }).then(function (result) {
                if (result === null) {
                    throw "Document doesn't have owner";
                }
                callback(null, document, result);
            }).catch(function (err) {
                callback(err);
            });
        },
        function (document, result, callback) {
            if (result.id === socket.request.user.id) {
                callback(null, document);
            } else {
                callback(new Error('Unauthenticated user ' + socket.request.user.id + ' trying to control file'));
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

            socket.on('show_qr', function () {
                memdb.presenterEnabled(memstore, document.id, function (enabled, pres_id) {
                    if (enabled === true) {
                        var qr_url = '/document/q/' + pres_id;
                        socket.emit('qrcode_url', qr_url);
                    }
                });
            });

            secure.bindPAuthRoot(socket, authEmitter, controlEmitter, document.id, function () {
                winston.info("presenter authenticated");
            });

            callback(null);
        }
    ], function (err) {
        if (err !== null) {
            winston.error("during bc11n root authorization: %s", String(err));
        }
    });
}

function listerComm(socket, data, db, memstore, s3bucket) {
    socket.request.user.getDocuments().then(function (documents) {
        documents.forEach(function (document) {
            socket.join(document.id + ":online");
            memdb.getOnline(memstore, document.id, function (count) {
                socket.emit('count', {id: document.id, count: count});
            });
        });
    }).catch(function (err) {
        winston.error('during getting documents from db for user %d: %s', socket.request.user.id , String(err));
    });
    socket.on('delete', function (document_id) {
        filemgr.deleteFile(s3bucket, document_id, socket.request.user, db, function (err) {
            if (err !== null) {
                io.to(document_id + ":deleted").emit("failed");
            } else {
                socket.emit('deleted', document_id);
                io.to(document_id + ":deleted").emit("deleted");
                socket.request.user.used_space(function (err, used_space) {
                    if (err !== null) {
                        socket.emit('used_space_update', 'error');
                    } else {
                        socket.emit('used_space_update', used_space);
                    }
                });
            }
        });
        // TODO: nejdriv nejak odpojit ostatni, taky mozna broadcastit do jinych kanalu?
    });
}

function presenterComm(socket, data, db, memstore, drawstore, config) {
    async.waterfall([
        function (callback) {
            memdb.getDocumentFromPresenter(memstore, data.pres_id, function (doc_id) {
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
                    memdb.getPdfId(memstore, doc_id, function (pdf_id) {
                        if (pdf_id !== false) {
                            var doc_url = url.resolve(config.link_url, '/document/d/' + pdf_id);
                            socket.emit('document_url', doc_url);
                        } else {
                            socket.emit('error', 'Cannot create PDF url.');
                        }
                    });
                    winston.info("presenter authenticated");
                    socket.join(doc_id);

                    memdb.getPage(memstore, doc_id, 1, function (page) {
                        socket.emit('page', page);
                    });

                    socket.on('page', function (page) {
                        socket.to(doc_id).emit('page', page);
                        memdb.putPage(memstore, doc_id, page);
                    });

                    // TODO: bud mit univerzalni "draw_event"
                    // -- rozsiritelne bez modifikace serveru
                    // -- asi min bezpecne (muze mi poslat kod, kterej pak
                    //    interpretuju v databazi!)
                    // nebo
                    // event pro kazdej druh
                    // -- nutnost rozbalovat je sam, vic eventu, bezpecnejsi
                    socket.on('pencil_event', function (coordinates) {
                        var event = {
                            type: 'pencil',
                            from: coordinates.from,
                            to: coordinates.to
                        };
                        var on_page = coordinates.page;
                        drawdb.putDrawingEvent(drawstore, doc_id, on_page, event);
                        socket.to(doc_id).emit('pencil_event', event);
                    });
                });

                callback(null);
            } else {
                callback(new Error('Trying to control disabled presentation.'));
            }
        }
    ], function (err) {
        if (err !== null) {
            winston.error("during bc11n presenter authorization: %s", String(err));
        }
    });
}

function viewerComm(socket, data, db, memstore, drawstore) {

}

module.exports.init = function (server, config, db, memstore, sessionStore, drawstore) {
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
                    winston.info('unlogged user request for socket.io root communication.');
                } else {
                    rootComm(socket, data, db, memstore, drawstore, config);
                }
                break;
            case 'presenter':
                presenterComm(socket, data, db, memstore, drawstore, config);
                break;
            case 'viewer':
                viewerComm(socket, data, db, memstore, drawstore);
                break;
            case 'lister':
                if (socket.request.user.logged_in === false) {
                    winston.info('unlogged user request for socket.io lister communication.');
                } else {
                    listerComm(socket, data, db, memstore, s3bucket);
                }
                break;
            }
        });
    });
};
