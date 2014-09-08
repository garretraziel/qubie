requirejs.config({
    baseUrl: "/javascript/lib",
    shim: {
        socketio: {
            exports: 'io'
        },
        pdfjs: {
            exports: 'PDFJS'
        },
        pdfjs_compat: ['pdfjs']
    },
    paths: {
        jquery: "//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min",
        jquerymobile: "//ajax.googleapis.com/ajax/libs/jquerymobile/1.4.3/jquery.mobile.min",
        socketio: "/socket.io/socket.io",
        vex: "/bower_components/vex/js/vex.min",
        vexdialog: "/bower_components/vex/js/vex.dialog.min",
        pdfjs: "/bower_components/pdfjs-bower/dist/pdf",
        pdfjs_compat: "/bower_components/pdfjs-bower/dist/compatibility",
        app: "../app"
    }
});