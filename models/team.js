"use strict";

module.exports = function (sequelize, DataTypes) {
    var Team = sequelize.define("Team", {
        email: DataTypes.STRING,
        premium_to: DataTypes.DATE,

        name: DataTypes.STRING,
        logo_key: DataTypes.STRING,
        members: DataTypes.INTEGER,
        members_limit: DataTypes.INTEGER,
        quota: DataTypes.FLOAT
    }, {
        instanceMethods: {
            used_space: function (done) {
                this.getDocuments().then(function (documents) {
                    var used = 0;
                    documents.forEach(function (document) {
                        used += document.size;
                    });
                    done(null, used);
                }).catch(function (err) {
                    done(err);
                });
            }
        },
        classMethods: {
            associate: function (models) {
                Team.hasMany(models.User);
                Team.hasOne(models.User, {as: "Administrator"});
            }
        }
    });
    return Team;
};
