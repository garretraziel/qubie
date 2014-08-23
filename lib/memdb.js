var redis = require('redis');
var shortId = require('shortid');

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
    memstore.hget("document:" + id, "page", function (err, reply) {
        if (err) {
            console.error("Err during reading page from mestore for document " + id + ":", err);
            done(default_page);
        } else {
            var page;
            if (reply === null) {
                memstore.hset("document:" + id, "page", default_page);
                page = default_page;
            } else {
                page = parseInt(reply, 10);
            }
            done(page);
        }
    });
}

function putPage(memstore, id, page) {
    memstore.hset("document:" + id, "page", page);
}

function incrOnline(memstore, id, done) {
    memstore.incr("document:" + id + ":online", function (err, count) {
        if (err) {
            console.error("Err memstore during incr of " + id + ":", err);
        }
        done(count);
    });
}

function decrOnline(memstore, id, done) {
    memstore.decr("document:" + id + ":online", function (err, count) {
        if (err) {
            console.error("Err memstore during decr of " + id + ":", err);
        }
        done(count);
    });
}

function getOnline(memstore, id, done) {
    memstore.get("document:" + id + ":online", function (err, count) {
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

function enablePresenter(memstore, id, done) {
    var pres_id = shortId.generate();

    memstore.hset("document:" + id, "presenter", true);
    memstore.hset("document:" + id, "presenter_id", pres_id);

    done(pres_id);
}

function disablePresenter(memstore, id) {
    memstore.hset("document:" + id, "presenter", false);
    memstore.hdel("document:" + id, "presenter_id");
}

function presenterEnabled(memstore, id, done) {
    memstore.hget("document:" + id, "presenter", function (err, reply) {
       if (err) {
            console.error("Err during reading presenter from mestore for document " + id + ":", err);
            done(false);
        } else {
            if (reply === null) {
                done(false);
            } else {
                done(reply);
            }
        }
    });
}

module.exports = {
    init: init,
    getPage: getPage,
    putPage: putPage,
    incrOnline: incrOnline,
    decrOnline: decrOnline,
    getOnline: getOnline,
    enablePresenter: enablePresenter,
    disablePresenter: disablePresenter,
    presenterEnabled: presenterEnabled
};