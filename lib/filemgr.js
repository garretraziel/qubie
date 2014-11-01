var shortId = require('shortid');
var winston = require('winston');

function uploadAndSaveFile(s3bucket, stream, user, db, done) {
    var id = shortId.generate();
    var length = stream.byteCount;

    if (length + user.used_space < user.quota) {
        s3bucket.putObject({
            Key: id,
            Body: stream,
            ACL: 'private'
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
                user.used_space += length;
                user.save();
                done(null);
            });
        });
    } else {
        return done(new Error("Disk quota exceeded."));
    }
}

function deleteFile(s3bucket, id, user, db, done) {

}

module.exports = {
    uploadAndSaveFile: uploadAndSaveFile,
    deleteFile: deleteFile
};
