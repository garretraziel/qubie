var fs = require('fs');
var path = require('path');

var development = {
    port: 8080,
    ssl: true,
    reverse_proxy: false,
    options: {
        key: fs.readFileSync(path.join(__dirname, "/misc/server.key")),
        cert: fs.readFileSync(path.join(__dirname, "/misc/server.crt"))
    },
    secret: "this-is-really-a-secret!",
    public: path.join(__dirname, "public"),
    postgres_url: "postgres://",
    redis_uri: "redis://localhost:6379"
};

// heroku
var production = {
    port: process.env.PORT,
    ssl: false,
    reverse_proxy: true,
    secret: process.env.SECRET_TOKEN,
    public: path.join(__dirname, "public"),
    postgres_uri: process.env.HEROKU_POSTGRESQL_ROSE_URL,
    redis_uri: process.env.REDISTOGO_URL
};

module.exports = {
    "development": development,
    "production": production
};