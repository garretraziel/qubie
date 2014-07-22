$(document).ready(function () {
    console.log("document ready");
    console.log(URL);
    PDFJS.getDocument(URL).then(function (pdf) {
        console.log("pdf ready");
        pdf.getPage(1).then(function (page) {
            var scale = 1.5;
            var viewport = page.getViewport(scale);

            var canvas = document.getElementById('cnvs');
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            console.log("got page");
            page.render(renderContext).then(function () {
                console.log("ready");
            });
        });
    });
});