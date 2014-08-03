module.exports = function (sequelize, DataTypes) {
    return sequelize.define("User", {
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        email: DataTypes.STRING,
        premium: DataTypes.BOOLEAN,
        premium_to: DataTypes.DATE,
        admin: DataTypes.BOOLEAN,
        quota: DataTypes.FLOAT,
        used_space: DataTypes.FLOAT
    });
};