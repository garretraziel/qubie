var redis = require('redis');

function init(config) {
    var parsed = require('url').parse(config.redis_uri);
    var client = redis.createClient(parsed.port, parsed.hostname);

    if (parsed.auth) {
        var splitted = parsed.auth.split(":");

        if (splitted.length === 2) {
            client.auth(splitted[1]);
        }
    }

    return client;
}

function getPage(memstore, id, default_page, done) {
    memstore.hget(id, "page", function (err, reply) {
        if (err) {
            console.error("Err during reading page from mestore for document " + id + ":", err);
            done(default_page);
        } else {
            var page;
            if (reply === null) {
                memstore.hset(id, "page", default_page);
                page = default_page;
            } else {
                page = parseInt(reply);
            }
            done(page);
        }
    });
}

function putPage(memstore, id, page) {
    memstore.hset(id, "page", page);
}

function incrOnline(memstore, id, done) {
    memstore.incr(id + ":online", function (err, count) {
        if (err) {
            console.error("Err memstore during incr of " + id + ":", err);
        }
        done(count);
    });
}

function decrOnline(memstore, id, done) {
    memstore.decr(id + ":online", function (err, count) {
        if (err) {
            console.error("Err memstore during decr of " + id + ":", err);
        }
        done(count);
    });
}

function getOnline(memstore, id, done) {
    memstore.get(id + ":online", function (err, count) {
        if (err) {
            console.error("Err memstore during get of " + id + ":", err);
        }
        if (count === null) {
            done(0);
        } else {
            done(count);
        }
    });
}

module.exports.init = init;
module.exports.getPage = getPage;
module.exports.putPage = putPage;
module.exports.incrOnline = incrOnline;
module.exports.decrOnline = decrOnline;
module.exports.getOnline = getOnline;