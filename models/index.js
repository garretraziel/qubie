module.exports = function (config) {
    if (!global.hasOwnProperty('db')) {
        var Sequelize = require('sequelize');
        var sequelize = null;

        var match = config.postgres_uri.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        sequelize = new Sequelize(match[5], match[1], match[2], {
            dialect: 'postgres',
            protocol: 'postgres',
            port: match[4],
            host: match[3],
            logging: true
        });

        global.db = {
            Sequelize: Sequelize,
            sequelize: sequelize
        }
    }
};