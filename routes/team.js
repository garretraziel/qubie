"use strict";

var express = require('express');
var winston = require('winston');

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
            team.used_space(function (err, used_space) {
                if (err) {
                    winston.error('during reading team used space: %s', String(err));
                    res.render('team', {users: users, team: team});
                } else {
                    res.render('team', {users: users, team: team, used_space: used_space});
                }
            });
        }, function (err) {
            winston.error("during rendering team with users: %s", String(err));
            res.redirect('/fail');
        });
    });

    return router;
};
