"use strict";

module.exports = function (sequelize, DataTypes) {
    var User = sequelize.define("User", {
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        email: DataTypes.STRING,
        premium: DataTypes.BOOLEAN,
        premium_to: DataTypes.DATE,
        admin: DataTypes.BOOLEAN,
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
                User.hasMany(models.Document);
                User.belongsTo(models.Team);
                User.belongsTo(models.Team, {as: "AdministredTeam"});
            }
        }
    });
    return User;
};
