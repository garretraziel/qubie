module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Document", {
        url: DataTypes.STRING,
        name: DataTypes.STRING,
        id: DataTypes.STRING
        //...
    });
};