var assert = require('assert');

var drawdb = require('../lib/drawdb');

function createLeveldb(init_values, fail_put) {
    var db = {};
    for (var i in init_values) {
        if (init_values.hasOwnProperty(i)) {
            db[i] = init_values[i];
        }
    }
    db.get = function (id, callback) {
        if (this.hasOwnProperty(id)) {
            callback(null, this[id]);
        } else {
            callback(new Error("value does not exist"));
        }
    };
    db.put = function (id, value, callback) {
        if (fail_put) {
            callback(new Error("error during writing to db"));
        } else {
            this[id] = value;
            callback(null);
        }
    };
    db.del = function (id, callback) {
        delete this[id];
        callback();
    }
    return db;
}

describe('drawdb', function () {
    var id = "1";
    var page = "17";

    describe("#putDrawingEvent", function () {
        it('should create value for event on new document page', function (done) {
            var db = createLeveldb({}, false);
            var value = {from: [0, 0], to: [100, 200]};
            drawdb.putDrawingEvent(db, id, page, value, function (err) {
                assert.equal(err, null);
                assert.deepEqual(db[id + ":" + page], [value]);
                assert.deepEqual(db[id], [page]);
                done();
            });
        });

        it('should add another event to events for page', function (done) {
            var id_page = id + ":" + page;
            var content = {};
            var oldvalue = {from: [0,0], to: [100, 200]};
            content[id_page] = [oldvalue];
            content[id] = [page];
            var db = createLeveldb(content, false);
            var value = {from: [100, 200], to: [50, 60]};
            drawdb.putDrawingEvent(db, id, page, value, function (err) {
                assert.equal(err, null);
                assert.deepEqual(db[id], [page]);
                assert.deepEqual(db[id_page], [oldvalue, value]);
                done();
            });
        });

        it('should add another page and event record when page is different', function (done) {
            var id_page = id + ":" + page;
            var id_page_n = id + ":" + (page + 1);
            var content = {};
            var oldvalue = {from: [0, 0], to: [100, 200]};
            content[id_page] = [oldvalue];
            content[id] = [page];
            var db = createLeveldb(content, false);
            var value = {from: [100, 200], to: [50, 60]};
            drawdb.putDrawingEvent(db, id, page+1, value, function (err) {
                assert.equal(err, null);
                assert.deepEqual(db[id], [page, page+1]);
                assert.deepEqual(db[id_page], [oldvalue]);
                assert.deepEqual(db[id_page_n], [value]);
                done();
            });
        });

        it('should add another document and page when doc and page are different', function (done) {
            var id_page = id + ":" + page;
            var id_n_page = (id+1) + ":" + page;
            var content = {};
            var oldvalue = {from: [0,0], to: [100, 200]};
            content[id_page] = [oldvalue];
            content[id] = [page];
            var db = createLeveldb(content, false);
            var value = {from: [100, 200], to: [50, 60]};
            drawdb.putDrawingEvent(db, id+1, page, value, function (err) {
                assert.equal(err, null);
                assert.deepEqual(db[id], [page]);
                assert.deepEqual(db[id+1], [page]);
                assert.deepEqual(db[id_page], [oldvalue]);
                assert.deepEqual(db[id_n_page], [value]);
                done();
            });
        });

        it('should return err where there was error during reading from db', function (done) {
            var db = createLeveldb({}, true);
            drawdb.putDrawingEvent(db, id, page, {from: [100, 200], to: [50, 60]}, function (err) {
                assert(err instanceof Error);
                done();
            });
        });
    });

    describe('#getDrawingEventsForPage', function () {
        it('should return array of drawing events for page', function (done) {
            var id_page = id + ":" + page;
            var content = {};
            var oldvalue = {from: [0,0], to: [100, 200]};
            var value = {from: [100, 200], to: [50, 60]};
            content[id_page] = [oldvalue, value];
            content[id] = [page];
            var db = createLeveldb(content, false);
            drawdb.getDrawingEventsForPage(db, id, page, function (result) {
                assert.deepEqual(result, [oldvalue, value]);
                done();
            });
        });

        it('should return empty array when there is no event', function (done) {
            var db = createLeveldb({}, false);
            drawdb.getDrawingEventsForPage(db, id, page, function (result) {
                assert.deepEqual(result, []);
                done();
            });
        });
    });

    describe('#deleteDrawingsForPage', function () {
        it('should delete all drawings for requested page', function (done) {
            var id_page = id + ":" + page;
            var id_page_n = id + ":" + (page + 1);
            var content = {};
            var oldvalue = {from: [0,0], to: [100, 200]};
            var value = {from: [100, 200], to: [50, 60]};
            content[id_page] = [oldvalue, value];
            content[id_page_n] = [value];
            content[id] = [page, page+1];
            var db = createLeveldb(content, false);
            drawdb.deleteDrawingsForPage(db, id, page, function() {
                assert.deepEqual(db[id], [page+1]);
                assert.deepEqual(db[id_page_n], [value]);
                assert.equal(db[id_page], undefined);
                done();
            });
        });
    });
});
