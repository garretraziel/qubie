"use strict";

module.exports = function (sequelize, DataTypes) {
    return sequelize.define("User", {
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
        }
    });
};
