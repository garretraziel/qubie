"use strict";

module.exports = function (sequelize, DataTypes) {
    var Document = sequelize.define("Document", {
        name: DataTypes.STRING,
        key: DataTypes.STRING,
        ppt_key: DataTypes.STRING,
        uploaded_at: DataTypes.DATE,
        size: {
            type: DataTypes.FLOAT
        }
        //...
    }, {
        classMethods: {
            associate: function (models) {
                Document.belongsTo(models.User, {
                    onDelete: "CASCADE"
                });
                Document.hasMany(models.View);
            }
        }
    });
    return Document;
};
