var express = require('express');

module.exports = function (config, db, memstore) {
    var router = express.Router();

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            next();
        } else {
            res.redirect('/login'); // TODO: flash a navrat zpet
        }
    });
    router.param('team_id', function (req, res, next, team_id) {
        var regex = /^\d+$/;
        if (regex.test(team_id)) {
            next();
        } else {
            next('route');
        }
    });

    router.get('/', function (req, res) {
        req.user.getAdministredTeam().success(function (team) {
            if (team === null) {
                res.render('fail');
            } else {
                team.getUsers().success(function (users) {
                    res.render('team', {users: users, team: team});
                });
            }
        });
    });

    return router;
};