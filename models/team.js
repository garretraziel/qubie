module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Team", {
        name: DataTypes.STRING
    });
};