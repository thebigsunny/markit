import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import InteractivePDFViewer from '../components/InteractivePDFViewer';
import ErrorBoundary from '../components/ErrorBoundary';
import './ViewerPage.css';

const ViewerPage = () => {
  const { id } = useParams();
  const [textbook, setTextbook] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTextbook = async () => {
      try {
        console.log('Fetching textbook with ID:', id);
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('textbooks')
          .select('*')
          .eq('id', id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching textbook:', fetchError);
          setError(`Failed to fetch textbook: ${fetchError.message}`);
          return;
        }
        
        if (!data) {
          setError('Textbook not found');
          return;
        }
        
        console.log('Textbook data:', data);
        setTextbook(data);
        
        if (data.file_path) {
          const { data: fileData } = supabase.storage
            .from('textbooks')
            .getPublicUrl(data.file_path);
            
          console.log('PDF URL:', fileData.publicUrl);
          setPdfFile(fileData.publicUrl);
        } else {
          setError('No file path found for this textbook');
        }
        
      } catch (error) {
        console.error('Error in fetchTextbook:', error);
        setError(`Error loading textbook: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTextbook();
    }
  }, [id]);

  if (loading) {
    return <div className="loading-screen">Loading Textbook...</div>;
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Textbook</h2>
        <p>{error}</p>
        <Link to="/menu">← Back to Library</Link>
      </div>
    );
  }

  if (!pdfFile) {
    return (
      <div className="error-screen">
        <h2>No PDF File Available</h2>
        <p>This textbook doesn't have a valid PDF file.</p>
        <Link to="/menu">← Back to Library</Link>
      </div>
    );
  }

  return (
    <div className="viewer-page">
      <header className="viewer-header">
        <Link to="/menu">&larr; Back to Library</Link>
        <h1>{textbook?.title}</h1>
        <div className="viewer-controls">
          <div className="zoom-controls">
            <button onClick={() => setScale(s => Math.max(0.4, s - 0.2))} disabled={scale <= 0.4}>-</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} disabled={scale >= 2.5}>+</button>
            <button onClick={() => setScale(1.0)}>Reset</button>
          </div>
        </div>
      </header>
      <div className="viewer-content">
        <ErrorBoundary>
          <div className="interactive-mode">
            <div className="mode-info">
              <p>🎯 Hover over text and elements to explore, click to interact!</p>
            </div>
            <InteractivePDFViewer file={pdfFile} scale={scale} />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ViewerPage;
