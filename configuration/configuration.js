"use strict";

var fs = require('fs');
var path = require('path');
var util = require('util');
var os = require('os');

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
    level_db: "/tmp/level.db",
    logging: true,
    aws_bucket: "qubie",
    link_url: util.format('https://%s:%d', os.hostname(), 8080),
    default_quota: 1000000,
    send_mails: false,
    log_access: false,
    file_log_output: false
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
    level_db: process.env.LEVEL_DB,
    logging: false,
    aws_bucket: "qubie",
    link_url: util.format('https://www.%s', "getqubie.com"),
    default_quota: 1000000,
    send_mails: true,
    mail_config: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: true,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    },
    log_access: true,
    access_log_file: "/var/log/qubie/access.log",
    file_log_output: true,
    system_log_file: "/var/log/qubie/system.log"
};

module.exports = {
    "development": development,
    "production": production
};
