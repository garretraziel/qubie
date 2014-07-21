var fs = require('fs');
var path = require('path');

var development = {
    port: 8080,
    ssl: true,
    reverse_proxy: false,
    options: {
        key: fs.readFileSync(path.join(__dirname, "../misc/server.key")),
        cert: fs.readFileSync(path.join(__dirname, "../misc/server.crt"))
    },
    secret: "this-is-really-a-secret!",
    public: path.join(__dirname, "../public"),
    views: path.join(__dirname, "../views"),
    postgres_uri: "postgres://node:node@localhost:5432/node",
    redis_uri: "redis://localhost:6379",
    logging: true,
    aws_bucket: "qubie"
};

// heroku
var heroku = {
    port: process.env.PORT,
    ssl: false,
    reverse_proxy: true,
    secret: process.env.SECRET_TOKEN,
    public: path.join(__dirname, "../public"),
    views: path.join(__dirname, "../views"),
    postgres_uri: process.env.HEROKU_POSTGRESQL_ROSE_URL,
    redis_uri: process.env.REDISTOGO_URL,
    logging: false,
    aws_bucket: "qubie"
};

var production = {
    port: 5102,
    ssl: false,
    reverse_proxy: true,
    secret: process.env.SECRET_TOKEN,
    public: path.join(__dirname, "../public"),
    views: path.join(__dirname, "../views"),
    postgres_uri: process.env.POSTGRES_URL,
    redis_uri: process.env.REDIS_URL,
    logging: false,
    aws_bucket: "qubie"
};

module.exports = {
    "development": development,
    "production": production,
    "heroku": heroku
};