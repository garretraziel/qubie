module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Document", {
        name: DataTypes.STRING,
        key: DataTypes.STRING
        //...
    });
};