"use strict";

module.exports = function (sequelize, DataTypes) {
    var View = sequelize.define("View", {
        when: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
        viewies: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false }
    }, {
        classMethods: {
            associate: function (models) {
                View.belongsTo(models.Document);
            }
        }
    });
    return View;
};
