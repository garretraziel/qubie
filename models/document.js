"use strict";

module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Document", {
        name: DataTypes.STRING,
        key: DataTypes.STRING,
        ppt_key: DataTypes.STRING,
        uploaded_at: DataTypes.DATE,
        size: {
            type: DataTypes.FLOAT
        }
        //...
    });
};
