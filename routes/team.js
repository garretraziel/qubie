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
        var team;
        req.user.getAdministredTeam().then(function (t) {
            if (t === null) {
                throw "Team doesn't exist";
            }
            team = t;
            return t.getUsers();
        }).then(function (users) {
            res.render('team', {users: users, team: team});
        }, function (err) {
            console.error("Error during rendering team with users:", err);
            res.redirect('/fail');
        });
    });

    return router;
};