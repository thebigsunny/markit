import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PDFViewer from '../components/PDFViewer';
import './ViewerPage.css';

const ViewerPage = () => {
  const { id } = useParams();
  const [textbook, setTextbook] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const fetchTextbook = async () => {
      const { data, error } = await supabase.from('textbooks').select('*').eq('id', id).single();
      if (error) {
        console.error('Error fetching textbook:', error);
      } else {
        setTextbook(data);
        const { data: fileData } = supabase.storage.from('textbooks').getPublicUrl(data.file_path);
        setPdfFile(fileData.publicUrl);
      }
    };
    fetchTextbook();
  }, [id]);

  const handlePageRendered = (pageNumber) => {
    // We can use this later if we need the dimensions of each page
  };

  if (!pdfFile) {
    return <div className="loading-screen">Loading Textbook...</div>;
  }

  return (
    <div className="viewer-page">
      <header className="viewer-header">
        <Link to="/menu">&larr; Back to Library</Link>
        <h1>{textbook?.title}</h1>
        <div className="zoom-controls">
          <button onClick={() => setScale(s => s - 0.2)} disabled={scale <= 0.6}>-</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => s + 0.2)} disabled={scale >= 2.0}>+</button>
          <button onClick={() => setScale(1.0)}>Reset</button>
        </div>
      </header>
      <div className="viewer-content">
        <PDFViewer file={pdfFile} onPageRendered={handlePageRendered} scale={scale} />
      </div>
    </div>
  );
};

export default ViewerPage;
