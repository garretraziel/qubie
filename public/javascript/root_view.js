var socket = io();
var canvas = document.getElementById('cnvs');
var context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var loaded_pdf, loaded_page, original_viewport;
var render_promise, rerender_timeout;

function rerenderPage() {
    console.log(original_viewport);
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

socket.on('connect', function () {
    socket.emit('join', {role: 'root'});
});

$(document).ready(function () {
    PDFJS.getDocument(URL).then(function (pdf) {
        loaded_pdf = pdf;
        pdf.getPage(1).then(function (page) {
            loaded_page = page;
            original_viewport = page.getViewport(1);
            rerenderPage();
        });
    });
    $(window).resize(function () {
        if (rerender_timeout) window.clearTimeout(rerender_timeout);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (render_promise) render_promise.cancel();
        rerender_timeout = window.setTimeout(function () {
            rerenderPage();
        }, 500); // TODO: tohle resit trochu lip
    });
});