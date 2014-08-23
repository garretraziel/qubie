var socket = io();
var canvas = document.getElementById('cnvs');
var context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var loaded_pdf, loaded_page, original_viewport;
var render_promise, rerender_timeout;
var act_page = 1;

var presenter_url;

function rerenderPageThen() {
    if (loaded_page) {
        var scale = canvas.height / original_viewport.height;
        var scaledViewport = loaded_page.getViewport(scale);

        var renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };

        render_promise = loaded_page.render(renderContext);
    }
}

function rerenderPage() {
    if (render_promise) {
        render_promise.cancel();
    }
    rerenderPageThen();
}

function getPage() {
    if (loaded_pdf) {
        loaded_pdf.getPage(act_page).then(function (page) {
            loaded_page = page;
            original_viewport = page.getViewport(1);
            rerenderPage();
        });
    }
}

socket.on('page', function (page) {
    act_page = page;
    getPage();
});

socket.on('connect', function () {
    socket.emit('join', {role: 'root', document: ID});
});

socket.on('auth_request', function (request) {
    vex.dialog.open({
        message: "Presenter " + request.name + " connected. Password:", // TODO: tady hrozi nejaky JavaScript injection
        input: '<input name="passwd" type="password">',
        callback: function (data) {
            var response = {};
            response.name = request.name;
            if (data === false) {
                response.outcome = "nack";
                socket.emit('auth_response', response);
            } else {
                response.outcome = "ack";
                response.passwd = data.passwd;
                socket.emit('auth_response', response);
            }
        }
    });
});

socket.on('presenter_url', function (url) {
    presenter_url = url;
    vex.dialog.alert('Presenter url: ' + url);
});

$(document).ready(function () {
    PDFJS.getDocument(URL).then(function (pdf) {
        loaded_pdf = pdf;
        getPage();
    });
    $(window).resize(function () {
        if (rerender_timeout) window.clearTimeout(rerender_timeout);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        rerender_timeout = window.setTimeout(function () {
            rerenderPage();
        }, 500); // TODO: tohle resit trochu lip
    });
    $("body").keydown(function (e) {
        if (e.which === 37) {
            if (act_page > 1) {
                act_page--;
                socket.emit('page', act_page);
                getPage();
            }
        } else if (e.which === 39) {
            act_page++;
            socket.emit('page', act_page);
            getPage();
        }
    });
    $("#presenter").change(function () {
        socket.emit("enable_presenter", $(this).is(':checked'));
    });
    /*$("#cntrls").click(function () {
        $(this).animate({
            width: "100px",
            height: "200px"
        });
    });*/
});