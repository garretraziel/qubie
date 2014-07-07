module.exports = function (sequelize, DataTypes) {
    return sequelize.define("User", {
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        premium: DataTypes.BOOLEAN,
        premium_to: DataTypes.DATE
    })
};