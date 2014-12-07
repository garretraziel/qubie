"use strict";

module.exports = function (sequelize, DataTypes) {
    return sequelize.define("View", {
        when: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        viewies: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false }
    });
};
