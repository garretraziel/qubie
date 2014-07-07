module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Document", {
        url: DataTypes.STRING
        //...
    })
};