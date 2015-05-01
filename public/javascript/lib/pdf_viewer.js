"use strict";

define(function (require) {
	var PDFJS = require("pdfjs"); require("pdfjs_compat");
	PDFJS.workerSrc = '/bower_components/pdfjs-dist/build/pdf.worker.js';

	var PdfViewer = function (canvas, URL) {
		this.canvas = canvas;
		this.context = canvas[0].getContext('2d');
		this.URL = URL;
	};
	
	PdfViewer.prototype.loadDocument = function (URL) {
		this.URL = this.URL || URL;
		PDFJS.getDocument(this.URL).then(function (pdf) {
	    	this.loadedPdf = pdf;
			this.actPage = this.actPage || 1;
			this.getPage();
	    }.bind(this));
	};
	
	PdfViewer.prototype.rerender = function () {
		if (this.rerenderTimeout) {
            window.clearTimeout(this.rerenderTimeout);
        }
        this.rerenderTimeout = window.setTimeout(function () {
            this.rerenderPage();
        }.bind(this), 500); // TODO: tohle resit trochu lip
	};
	
	PdfViewer.prototype.rerenderPage = function () {
	    if (this.renderPromise) {
	        this.renderPromise.cancel();
	    }
	    if (this.loadedPage) {
	        var scale = this.canvas.height() / this.originalViewport.height;
	        var scaledViewport = this.loadedPage.getViewport(scale);
	
	        var renderContext = {
	            canvasContext: this.context,
	            viewport: scaledViewport
	        };
	
	        this.renderPromise = this.loadedPage.render(renderContext);
	    }
	};
	
	PdfViewer.prototype.getPage = function () {
	    if (this.loadedPdf) {
	        this.loadedPdf.getPage(this.actPage).then(function (page) {
	            this.loadedPage = page;
	            this.originalViewport = page.getViewport(1);
	            this.rerenderPage();
	        }.bind(this));
	    }
	};
	
	PdfViewer.prototype.setPage = function (page) {
		this.actPage = page;
		this.getPage();
	};
	
	PdfViewer.prototype.decPage = function () {
		if (this.actPage <= 1) {
			return this.actPage;
		}
		this.actPage--;
		this.getPage();
		return this.actPage;
	};
	
	PdfViewer.prototype.incPage = function () {
		if (this.actPage >= this.loadedPdf.numPages) {
			return this.actPage;
		}
		this.actPage++;
		this.getPage();
		return this.actPage;
	}

	return {
		PdfViewer: PdfViewer
	}
});