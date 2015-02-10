"use strict";

define(function (require) {
    var $ = require('jquery'); require('jqueryvalidate');

    $('.form-to-validate').validate({
        rules: {
            repeat: {
                equalTo: "#password"
            }
        }
    });
});
