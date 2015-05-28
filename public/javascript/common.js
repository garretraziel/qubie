"use strict";

requirejs.config({
    baseUrl: "/javascript/lib",
    shim: {
        pdfjs: {
            exports: 'PDFJS'
        },
        pdfjs_compat: ['pdfjs']
    },
    paths: {
        jquery: "/bower_components/jquery/dist/jquery.min",
        jqueryvalidate: "/bower_components/jquery.validation/dist/jquery.validate",
        fastclick: "/bower_components/fastclick/lib/fastclick",
        socketio: "/socket.io/socket.io",
        vex: "/bower_components/vex/js/vex.min",
        vexdialog: "/bower_components/vex/js/vex.dialog.min",
        pdfjs: "/bower_components/pdfjs-dist/build/pdf",
        pdfjs_compat: "/bower_components/pdfjs-dist/web/compatibility",
        hammerjs: "/bower_components/hammer.js/hammer.min",
        app: "../app"
    }
});
