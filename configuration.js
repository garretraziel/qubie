var fs = require('fs');
var path = require('path');

var development = {
    redisSessionStoreConfig: {
        host: "localhost",
        port: 6379
    },
    host: "0.0.0.0",
    port: 8080,
    ssl: true,
    reverse_proxy: false,
    options: {
        key: fs.readFileSync(path.join(__dirname, "/misc/server.key")),
        cert: fs.readFileSync(path.join(__dirname, "/misc/server.crt"))
    },
    secret: "this-is-really-a-secret!"
};

var production = {
    redisSessionStoreConfig: {
        host: process.env.OPENSHIFT_REDIS_HOST,
        port: process.env.OPENSHIFT_REDIS_PORT,
        pass: process.env.REDIS_PASSWORD
    },
    host: process.env.OPENSHIFT_NODEJS_IP,
    port: process.env.OPENSHIFT_NODEJS_PORT,
    ssl: false,
    reverse_proxy: true,
    secret: process.env.OPENSHIFT_SECRET_TOKEN
};

module.exports = {
    "development": development,
    "production": production
};