var path = require('path');

module.exports = function (config) {
    if (!global.hasOwnProperty('db')) {
        var Sequelize = require('sequelize');
        var sequelize;

        sequelize = new Sequelize(config.postgres_uri, {
            logging: console.log
        });

        global.db = {
            Sequelize: Sequelize,
            sequelize: sequelize,
            User: sequelize.import(path.join(__dirname, 'user')),
            Document: sequelize.import(path.join(__dirname, 'document')),
            Team: sequelize.import(path.join(__dirname, 'team')),
            View: sequelize.import(path.join(__dirname, 'view'))
        };

        global.db.User.hasMany(global.db.Document);
        global.db.Document.belongsTo(global.db.User);
        global.db.Team.hasMany(global.db.User);
        global.db.User.belongsTo(global.db.Team);
        global.db.Document.hasMany(global.db.View);
        global.db.View.belongsTo(global.db.Document);
        global.db.Team.hasMany(global.db.Document);
        global.db.Document.belongsTo(global.db.Team);
        // TODO: dodelat nejake restrikce nad databazi (unique, not null a tak)
    }
    return global.db;
};