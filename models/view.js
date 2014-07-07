module.exports = function (sequelize, DataTypes) {
    return sequelize.define("View", {
        when: DataTypes.DATE
    });
};