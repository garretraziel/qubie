var redis = require('redis');

module.exports.init = function (config) {
    var parsed = require('url').parse(config.redis_uri);
    var client = redis.createClient(parsed.port, parsed.hostname);

    if (parsed.auth) {
        var splitted = parsed.auth.split(":");

        if (splitted.length === 2) {
            client.auth(splitted[1]);
        }
    }

    return client;
};