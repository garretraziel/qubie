"use strict";

var express = require('express');
var winston = require('winston');
var async = require('async');

var secure = require('../lib/secure');
var filemgr = require('../lib/filemgr');

module.exports = function (config, db, s3bucket) {
    var router = express.Router();

    router.use(function (req, res, next) {
        if (req.isAuthenticated()) {
            if (req.user.admin) {
                next();
            } else {
                res.redirect('/fail');
            }
        } else {
            res.redirect('/login');
        }
    });

    router.param('database_id', function (req, res, next, database_id) {
        var regex = /^\d+$/;
        if (regex.test(database_id)) {
            next();
        } else {
            next('route');
        }
    });

    router.get('/', function (req, res) {
        res.redirect('/admin/users');
    });
    router.get('/users', function (req, res) {
        if (req.query.search_name) {
            db.User.findAll({
                where: ["username like ?", '%' + req.query.search_name + '%']
            }).success(function (users) {
                res.render('admin/users', {users: users});
            });
        } else if (req.query.search_email) {
            db.User.findAll({where: {email: req.query.search_email}}).success(function (users) {
                res.render('admin/users', {users: users});
            });
        } else {
            db.User.all().success(function (users) {
                res.render('admin/users', {users: users});
            });
        }
    });
    router.get('/user/:database_id', function (req, res) {
        db.User.find(req.params.database_id).success(function (user) {
            if (user === null) {
                res.render('404');
            } else {
                async.parallel({
                    documents: function (callback) {
                        user.getDocuments().success(function (documents) {
                            callback(null, documents);
                        }).error(function (err) {
                            callback(err);
                        });
                    },
                    used_space: function (callback) {
                        user.used_space(callback);
                    }
                }, function (err, results) {
                    if (err) {
                        winston.error("during reading user documents: %s", String(err));
                        res.render('admin/user_detail', {user: user});
                    } else {
                        results.user = user;
                        res.render('admin/user_detail', results);
                    }
                });
            }
        });
    });
    router.route('/user/:database_id/edit')
        .get(function (req, res) {
            db.User.find(req.params.database_id).success(function (user) {
                if (user === null) {
                    res.render('404');
                } else {
                    res.render('admin/user_edit', {user: user});
                }
            });
        })
        .post(function (req, res) {
            secure.changeUser(db, {
                database_id: req.params.database_id,
                username: req.body.username,
                email: req.body.email,
                premium: req.body.premium,
                premium_to: req.body.premium_to,
                admin: req.body.admin,
                quota: req.body.quota,
                password: req.body.password
            }, function (err) {
                if (err) {
                    winston.error('during changing user: %s', String(err));
                    res.redirect('back');
                } else {
                    res.redirect('/admin/user/' + req.params.database_id);
                }
            });
        });
    router.route('/user/:database_id/delete')
        .get(function (req, res) {
            db.User.find(req.params.database_id).success(function (user) {
                if (user === null) {
                    res.render('404');
                } else {
                    res.render('admin/delete', {name: user.username});
                }
            });
        })
        .post(function (req, res) {
            if (req.body.input === "delete") {
                async.waterfall([
                    function (callback) {
                        db.User.find(req.params.database_id).success(function (user) {
                            callback(null, user);
                        }).error(function (err) {
                            callback(err);
                        });
                    },
                    function (user, callback) {
                        user.getDocuments().success(function (documents) {
                            callback(null, user, documents);
                        }).error(function (err) {
                            callback(err);
                        });
                    },
                    function (user, documents, callback) {
                        async.each(documents, function (document, callback2) {
                            filemgr.deleteFile(s3bucket, document.id, user, db, callback2);
                        }, function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                user.destroy();
                                callback(null);
                            }
                        });
                    }
                ], function (err) {
                    if (err) {
                        winston.error('during deleting user files: %s', String(err));
                    }
                    res.redirect('/admin/users');
                });
            } else {
                res.redirect('/admin/user/' + req.params.database_id);
            }
        });
    router.route('/user/new')
        .get(function (req, res) {
            res.render('admin/user_edit', {user: {}});
        })
        .post(function (req, res) {
            secure.createUser(config, db, {
                username: req.body.username,
                password: req.body.password,
                email: req.body.email,
                premium: req.body.premium,
                admin: req.body.admin,
                quota: req.body.quota
            }, function (err) {
                if (err) {
                    winston.error('during creating user: %s', String(err));
                    res.redirect('/admin/user/new');
                } else {
                    res.redirect('/admin'); // TODO: flash!
                }
            });
        });

    router.get('/documents', function (req, res) {
        if (req.query.search_name) {
            db.Document.findAll({
                where: ["name like ?", '%' + req.query.search_name + '%']
            }).success(function (documents) {
                res.render('admin/documents', {documents: documents});
            });
        } else if (req.query.search_key) {
            db.Document.findAll({where: {key: req.query.search_key}}).success(function (documents) {
                res.render('admin/documents', {documents: documents});
            });
        } else {
            db.Document.all().success(function (documents) {
                res.render('admin/documents', {documents: documents});
            });
        }
    });
    router.get('/document/:database_id', function (req, res) {
        db.Document.find(req.params.database_id).success(function (document) {
            if (document === null) {
                res.render('404');
            } else {
                document.getUser().success(function (user) {
                    res.render('admin/document_detail', {document: document, user: user});
                }).error(function (err) {
                    winston.error('during reading document owner: %s', String(err));
                    res.render('admin/document_detail', {document: document});
                });
            }
        });
    });
    router.route('/document/:database_id/edit')
        .get(function (req, res) {
            db.Document.find(req.params.database_id).success(function (document) {
                if (document === null) {
                    res.render('404');
                } else {
                    document.getUser().success(function (user) {
                        res.render('admin/document_edit', {document: document, user: user});
                    });
                }
            });
        })
        .post(function (req, res) {
            filemgr.changeDbFile(db, {
                database_id: req.params.database_id,
                name: req.body.name,
                key: req.body.key,
                uploaded_at: req.body.uploaded_at,
                owner: req.body.owner,
                change_owner: req.body.change_owner
            }, function (err) {
                if (err) {
                    winston.error('during changing document: %s', String(err));
                    res.redirect('back');
                } else {
                    res.redirect('/admin/document/' + req.params.database_id);
                }
            });
        });
    // TODO: document edit, new, delete

    return router;
};
