$(document).ready(function () {
    PDFJS.getDocument(URL).then(function (pdf) {
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

            page.render(renderContext).then(function () {
                console.log("ready");
            });
        });
    });
});