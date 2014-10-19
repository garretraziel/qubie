var redis = require('redis');
var shortId = require('shortid');
var winston = require('winston');

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
            winston.error("during reading page from memstore for document %d: %s", id, String(err));
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
    memstore.hset("document:" + id, "page", page); //TODO: co kdyz to selze?
}

function incrOnline(memstore, id, done) {
    memstore.incr("document:" + id + ":online", function (err, count) {
        if (err) {
            winston.error("in memstore during incr of %d: %s", id, String(err));
            return done(0);
        }
        done(count);
    });
}

function decrOnline(memstore, id, done) {
    memstore.decr("document:" + id + ":online", function (err, count) {
        if (err) {
            winston.error("in memstore during decr of %d: %s", id, String(err));
            return done(0);
        }
        done(count);
    });
}

function getOnline(memstore, id, done) {
    memstore.get("document:" + id + ":online", function (err, count) {
        if (err) {
            winston.error("in memstore during get of %d: %s", id, String(err));
            return done(0);
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
    var pdf_id = shortId.generate();

    memstore.hset("document:" + id, "presenter_id", pres_id); //TODO: hset a set muze selhat. co pak?
    memstore.set("presenter:" + pres_id, id);
    memstore.hset("document:" + id, "pdf_id", pdf_id);
    memstore.set("pdf:" + pdf_id, id);

    done(pres_id);
}

function disablePresenter(memstore, id) {
    // TODO: mozna by bylo lepsi rozhodovat se podle boolean hodnoty a nespolehat na null
    memstore.hget("document:" + id, "presenter_id", function (err, reply) {
        if (err) {
            winston.error("during reading presenter_id from memstore for document %d: %s", id, String(err));
        } else if (reply !== null) {
            memstore.del("presenter:" + reply);
            memstore.hdel("document:" + id, "presenter_id");
        }
    });
    memstore.hget("document:" + id, "pdf_id", function (err, reply) {
        if (err) {
            winston.error("during reading pdf_id from memstore for document %d: %s", id, String(err));
        } else if (reply !== null) {
            memstore.del("pdf:" + reply);
            memstore.hdel("document:" + id, "pdf_id");
        }
    });
}

function presenterEnabled(memstore, id, done) {
    // TODO: mozna kvuli tomu mit zvlast promennou
    memstore.hget("document:" + id, "presenter_id", function (err, reply) {
        if (err) {
            winston.error("during reading presenter from memstore for document %d: %s", id, String(err));
            done(false);
        } else if (reply === null) {
            done(false);
        } else {
            done(true);
        }
    });
}

function getDocumentFromPresenter(memstore, presenter_id, done) {
    memstore.get("presenter:" + presenter_id, function (err, reply) {
        if (err) {
            winston.error("during reading presenter_id %s from memstore: %s", presenter_id, String(err));
            done(false);
        } else if (reply === null) {
            done(false);
        } else {
            done(reply);
        }
    });
}

function getDocumentFromPdfId(memstore, pdf_id, done) {
    memstore.get("pdf:" + pdf_id, function (err, reply) {
        if (err) {
            winston.error("during reading pdf_id %s from memstore: %s", pdf_id, String(err));
            done(false);
        } else if (reply === null) {
            done(false);
        } else {
            done(reply);
        }
    });
}

function getPdfId(memstore, document_id, done) {
    memstore.hget("document:" + document_id, "pdf_id", function (err, reply) {
        if (err) {
            winston.error("during reading pdf_id from memstore: %s", String(err));
            done(false);
        } else if (reply === null) {
            done(false);
        } else {
            done(reply);
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
    presenterEnabled: presenterEnabled,
    getDocumentFromPresenter: getDocumentFromPresenter,
    getDocumentFromPdfId: getDocumentFromPdfId,
    getPdfId: getPdfId
};