import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up PDF.js worker for version 3.x compatibility
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).toString();
}

const PDFViewer = ({ file, onPageRendered, scale }) => {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-viewer-container">
      <Document 
        file={file} 
        onLoadSuccess={onDocumentLoadSuccess}
        options={{
          verbosity: 0 // Reduce console warnings
        }}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <div key={`page_container_${index + 1}`} className="page-container">
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              renderTextLayer={true}
              onRenderSuccess={() => onPageRendered && onPageRendered(index + 1)}
              scale={scale}
            />
          </div>
        ))}
      </Document>
    </div>
  );
};

export default PDFViewer;
