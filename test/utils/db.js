module.exports = function (inserted_object, created_success_object, errs) {
    var existing_object = {};
    var created_object = {};
    for (var key in inserted_object) {
        if (inserted_object.hasOwnProperty(key)) {
            existing_object[key] = inserted_object[key];
        }
    }
    existing_object.updateAttributes = function (updated, what) {
        var len = what.length;
        for (var i = 0; i < len; i++) {
            existing_object[what[i]] = updated[what[i]];
        }
        return {
            success: function (done) {
                if (!errs.iserror_update) {
                    done();
                }
                return {
                    error: function (done) {
                        if (errs.iserror_update) {
                            done(new Error('Error during updating values in db'));
                        }
                    }
                };
            }
        };
    };
    var find_function = function () {
        return {
            success: function(done) {
                if (!errs.iserror_find) {
                    if (errs.isnull) {
                        done(null);
                    } else {
                        done(existing_object);
                    }
                }
                return {
                    error: function (done) {
                        if (errs.iserror_find) {
                            done(new Error('Error during reading from db'));
                        }
                    }
                };
            }
        };
    };
    var create_function = function (options) {
        if (!errs.iserror_create) {
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    created_object[key] = options[key];
                }
            }
        }
        return {
            success: function (done) {
                if (!errs.iserror_create) {
                    done(created_success_object);
                }
                return {
                    error: function (done) {
                        if (errs.iserror_create) {
                            done(new Error('Error during writing to db'));
                        }
                    }
                };
            }
        };
    };
    return {
        User: {
            find: find_function,
            create: create_function,
            created: created_object,
            existing: existing_object
        },
        Document: {
            find: find_function,
            create: create_function,
            created: created_object,
            existing: existing_object
        }
    };
};
