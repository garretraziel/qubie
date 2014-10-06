var shortId = require('shortid');

function uploadAndSaveFile(s3bucket, part, user, db, done) {
    var id = shortId.generate();

    part.length = part.byteCount; // TODO: jak je to presne s velikosti?
    if (part.length + user.used_space < user.quota) {
        s3bucket.putObject({
            Key: id,
            Body: part,
            ACL: 'private'
        }, function (err) {
            if (err) {
                console.error("ERR S3:", err); // TODO: resit nejak vic
                return done(err);
            }
            db.Document.create({
                key: id,
                name: part.filename,
                size: part.length
            }).success(function (document) {
                document.setUser(user);
                user.used_space += part.length;
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
    deleteFile: deleteFile()
};