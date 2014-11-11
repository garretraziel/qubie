module.exports = function (sequelize, DataTypes) {
    return sequelize.define("Team", {
        email: DataTypes.STRING,
        premium_to: DataTypes.DATE,

        name: DataTypes.STRING,
        logo_key: DataTypes.STRING,
        members: DataTypes.INTEGER,
        members_limit: DataTypes.INTEGER,
        quota: DataTypes.FLOAT
    }, {
        instanceMethods: {
            used_space: function (done) {
                this.getDocuments().success(function (documents) {
                    var used = 0;
                    documents.forEach(function (document) {
                        used += document.size;
                    });
                    done(null, used);
                }).error(function (err) {
                    done(err);
                });
            }
        }
    });
};
