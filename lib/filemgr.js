var shortId = require('shortid');
var async = require('async');
var winston = require('winston');

function uploadAndSaveFile(s3bucket, stream, user, db, done) {
    var id = shortId.generate();
    var length = stream.byteCount;

    user.used_space(function (err, used_space) {
        if (err) return done(err);
        if (length + used_space < user.quota) {
            s3bucket.putObject({
                Key: id,
                Body: stream,
                ACL: 'private',
                ContentLength: length
            }, function (err) {
                if (err) {
                    winston.error("during writing to S3: %s", String(err)); // TODO: resit nejak vic
                    return done(err);
                }
                db.Document.create({
                    key: id,
                    name: stream.filename,
                    size: length
                }).success(function (document) {
                    document.setUser(user);
                    done(null);
                }).error(function (err) {
                    winston.error("during saving document to db: %s", String(err));
                    // TODO: smazat bucket
                    return done(err);
                });
            });
        } else {
            return done(new Error("Disk quota exceeded."));
        }
    });
}

function deleteFile(s3bucket, id, user, db, done) {
    async.waterfall([
        function (callback) {
            var document;
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
                    callback(null, document);
                } else {
                    callback(new Error("User " + user.id + " is trying to delete file that's not his."));
                }
            }, function (err) {
                callback(err);
            });
        },
        function (document, callback) {
            s3bucket.deleteObject({Key: document.key}, function (err, data) {
                if (err !== null) {
                    callback(err);
                } else {
                    callback(null, document, data);
                }
            });
        },
        function (document, data, callback) {
            document.getUser().then(function (user) {
                if (user === null) {
                    return document.destroy();
                }
                return document.destroy();
            }).then(function () {
                callback(null);
            }, function (err) {
                callback(err);
            });
        }
    ], function (err) {
        if (err !== null) {
            winston.error("during deleting file from S3 and db: %s", String(err));
            return done(err);
        }
        return done(null);
    });
}

function changeDbFile(db, args, done) {
    if (!args.database_id) {
        return done(new Error('Database_id should be provided in arguments'));
    }
    db.Document.find(args.database_id).success(function (document) {
        if (document === null) {
            done(new Error('Trying to edit non-existent document: ' + args.database_id));
        } else {
            var updated = {};
            var to_update = ["name", "key", "uploaded_at"];
            to_update.forEach(function (item) {
                updated[item] = args[item] === ""? null : args[item];
            });
            document.updateAttributes(updated, to_update).success(function () {
                if (args.change_owner) {
                    db.User.find(args.owner).success(function (owner) {
                        if (owner === null) {
                            winston.error('cannot set owner to nonexistent user %d', args.owner);
                            done(new Error('Cannot set owner to nonexistent user'));
                        } else {
                            document.setUser(owner).success(function () {
                                done(null);
                            }).error(function (err) {
                                winston.error('during updating document owner: %s', String(err));
                                done(err);
                            });
                        }
                    }).error(function (err) {
                        winston.error('during updating document owner: %s', String(err));
                        done(err);
                    });
                } else {
                    done(null);
                }
            }).error(function (err) {
                winston.error('during updating attributes: %s', String(err));
                done(err);
            });
        }
    }).error(function (err) {
        winston.error('during changing document in db: %s', String(err));
        return done(err);
    });
}

module.exports = {
    uploadAndSaveFile: uploadAndSaveFile,
    deleteFile: deleteFile,
    changeDbFile: changeDbFile
};
