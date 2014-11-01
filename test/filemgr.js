var assert = require('assert');
var async = require('async');
var createDummyDb = require('./utils/db');

var filemgr = require('../lib/filemgr');

describe('filemgr', function () {
    describe('#uploadAndSaveFile', function () {
        it('should upload streamed file to AWS S3', function (done) {
            var stream = {byteCount: 10, filename: 'filename'};
            var s3bucket = {};
            var id;
            s3bucket.putObject = function (object, after) {
                assert.equal(typeof object.Key, "string");
                id = object.Key;
                assert.deepEqual(object.Body, stream);
                assert.equal(object.ACL, 'private');
                after();
            };
            var user = {used_space: 0, quota: 1000};
            var createdObject = {};
            createdObject.setUser = function (user_to_set) {
                assert.equal(user_to_set, user);
            };
            var db = createDummyDb(null, createdObject, {});
            async.parallel([
                function (callback) {
                    user.save = function () {
                        callback();
                    };
                },
                function (callback) {
                    filemgr.uploadAndSaveFile(s3bucket, stream, user, db, function (err) {
                        assert.equal(err, null);
                        assert.equal(user.used_space, stream.byteCount);
                        assert.equal(db.Document.created.key, id);
                        assert.equal(typeof db.Document.created.key, "string");
                        assert.equal(db.Document.created.name, stream.filename);
                        assert.equal(db.Document.created.size, stream.byteCount);
                        callback();
                    });
                }
            ], function () {
                done();
            });
        });

        it('should return error when user exceeded quota', function (done) {
            var stream = {byteCount: 100, filename: 'filename'};
            var s3bucket = {};
            s3bucket.putObject = function (object, after) {
                throw new Error('This function should not be called');
            };
            var user = {used_space: 100, quota: 150};
            var db = createDummyDb(null, null, {});
            filemgr.uploadAndSaveFile(s3bucket, stream, user, db, function (err) {
                assert(err instanceof Error);
                assert.equal(user.used_space, 100);
                done();
            });
        });

        it('should return error when there was error during reading from db', function (done) {
            var stream = {byteCount: 100, filename: 'filename'};
            var s3bucket = {};
            s3bucket.putObject = function (object, after) {after();};
            var user = {used_space: 0, quota: 150};
            var db = createDummyDb(null, null, {iserror_create: true});
            filemgr.uploadAndSaveFile(s3bucket, stream, user, db, function (err) {
                assert(err instanceof Error);
                assert.equal(user.used_space, 0);
                done();
            });
        });

        it('should return error when there was error during saving to S3', function (done) {
            var stream = {byteCount: 100, filename: 'filename'};
            var s3bucket = {};
            s3bucket.putObject = function (object, after) {after(new Error('S3 error'));};
            var user = {used_space: 0, quota: 150};
            var db = createDummyDb(null, null, {iserror_create: true});
            filemgr.uploadAndSaveFile(s3bucket, stream, user, db, function (err) {
                assert(err instanceof Error);
                assert.equal(user.used_space, 0);
                done();
            });
        });
    });
});
