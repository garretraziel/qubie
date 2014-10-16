var fs = require('fs');
var bunyan = require('bunyan');

module.exports.init = function (config) {
    var loggerOutputStream = fs.createWriteStream(config.system_log_file);
    return bunyan.createLogger({
        name: "qubie",
        stream: loggerOutputStream,
        level: "info"
    });
};