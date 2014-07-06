var fs = require('fs');
var path = require('path');

var development = {
    redisSessionStoreConfig: {
        host: "localhost",
        port: 6379
    },
    port: 8080,
    ssl: true,
    reverse_proxy: false,
    options: {
        key: fs.readFileSync(path.join(__dirname, "/misc/server.key")),
        cert: fs.readFileSync(path.join(__dirname, "/misc/server.crt"))
    },
    secret: "this-is-really-a-secret!",
    public: path.join(__dirname, "public")
};

/*var production = {
    redisSessionStoreConfig: {
        host: process.env.OPENSHIFT_REDIS_HOST,
        port: process.env.OPENSHIFT_REDIS_PORT,
        pass: process.env.REDIS_PASSWORD
    },
    host: process.env.OPENSHIFT_NODEJS_IP,
    port: process.env.OPENSHIFT_NODEJS_PORT,
    ssl: false,
    reverse_proxy: true,
    secret: process.env.OPENSHIFT_SECRET_TOKEN,
    public: path.join(__dirname, "public")
};*/

var production = {
    port: process.env.PORT,
};

module.exports = {
    "development": development,
    "production": production
};