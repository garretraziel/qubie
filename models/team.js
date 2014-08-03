module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Team", {
        email: DataTypes.STRING,
        premium_to: DataTypes.DATE,

        name: DataTypes.STRING,
        logo_key: DataTypes.STRING,
        members: DataTypes.INTEGER,
        members_limit: DataTypes.INTEGER,
        quota: DataTypes.FLOAT,
        used_space: DataTypes.FLOAT
    });
};