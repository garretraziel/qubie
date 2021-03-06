"use strict";

var shortId = require('shortid');
var async = require('async');
var winston = require('winston');

function uploadAndSaveFile(s3bucket, stream, user, db, done) {
    var id = shortId.generate();
    var length = stream.byteCount;

    if (length === 0) {
        return done(new Error("Empty file provided."))
    }

    user.used_space(function (err, used_space) {
        if (err) {
            return done(err);
        }
        if (length + used_space < user.quota) {
            s3bucket.putObject({
                Key: id,
                Body: stream,
                ACL: 'private',
                ContentLength: length
            }, function (err) {
                if (err) {
                    return done(err);
                }
                db.Document.create({
                    key: id,
                    name: stream.filename,
                    size: length
                }).success(function (document) {
                    document.setUser(user).then(function (doc) {done(null)});
                }).error(done);
            });
        } else {
            return done(new Error("Disk quota exceeded."));
        }
    });
}

function deleteFile(s3bucket, id, user, db, done) {
    var document;
    async.waterfall([
        function (callback) {
            db.Document.find(id).then(function (d) {
                if (d === null) {
                    callback(new Error("Document " + id + " doesn't exist"));
                }
                document = d;
                return d.getUser();
            }).then(function (result) {
                if (result === null) {
                    callback(new Error("Document " + id + " doesn't have owner"));
                } else if (result.id === user.id) {
                    callback();
                } else {
                    callback(new Error("User " + user.id + " is trying to delete file that's not his."));
                }
            }, function (err) {
                callback(err);
            });
        },
        function (callback) {
            s3bucket.deleteObject({Key: document.key}, callback);
        },
        function (data, callback) {
            document.destroy().then(callback, callback);
        }
    ], done);
}

function changeDbFile(db, args, done) {
    if (!args.database_id) {
        return done(new Error('Database_id should be provided in arguments'));
    }
    var updated = {};
    var to_update = ["name", "key", "uploaded_at"];
    to_update.forEach(function (item) {
        updated[item] = args[item] === "" ? null : args[item];
    });
    async.waterfall([
        function (callback) {
            db.Document.find(args.database_id).success(function (document) {
                if (document === null) {
                    callback(new Error('Trying to edit non-existent document: ' + args.database_id));
                } else {
                    callback(null, document);
                }
            }).error(function (err) {
                callback(err);
            });
        },
        function (document, callback) {
            document.updateAttributes(updated, to_update).success(function () {
                callback(null, document);
            }).error(function (err) {
                callback(err);
            });
        },
        function (document, callback) {
            if (args.change_owner) {
                db.User.find(args.owner).success(function (owner) {
                    if (owner === null) {
                        callback(new Error('Cannot set owner to nonexistent user'));
                    } else {
                        document.setUser(owner).success(function () {
                            callback(null);
                        }).error(function (err) {
                            callback(err);
                        });
                    }
                }).error(function (err) {
                    callback(err);
                });
            } else {
                callback(null);
            }
        }
    ], function (err) {
        if (err) {
            winston.error('during updating attributes: %s', String(err));
            done(err);
        } else {
            done(null);
        }
    });
}

module.exports = {
    uploadAndSaveFile: uploadAndSaveFile,
    deleteFile: deleteFile,
    changeDbFile: changeDbFile
};
