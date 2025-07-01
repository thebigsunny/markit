import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { supabase } from '../lib/supabase'; // Make sure you have this
import { useAuth } from '../contexts/AuthContext'; // To get the current user
import TextbookCard from '../components/TextbookCard'; // Import the new component
import './MenuPage.css';

const AddCard = ({ onClick, isPrimary, isLoading }) => {
  return (
    <div
      className={`add-card ${isPrimary ? 'primary' : 'secondary'} ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
    >
      {isLoading ? (
        <>
          <div className="spinner"></div>
          <p className="add-text">Uploading...</p>
        </>
      ) : (
        <>
          <div className="plus-icon">+</div>
          <p className="add-text">Upload Textbook</p>
        </>
      )}
    </div>
  );
};

const MenuPage = () => {
  const { user } = useAuth();
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true); // For fetching initial data
  const [uploading, setUploading] = useState(false); // For upload state
  const fileInputRef = useRef(null);

  // Fetch textbooks from the database
  const fetchTextbooks = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('textbooks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching textbooks:', error);
    } else {
      setTextbooks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTextbooks();
  }, [user]); // Re-fetch when user object is available

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not found, cannot upload file.");
      setUploading(false);
      return;
    }

    // Sanitize the filename to be URL-friendly, replacing unsafe characters
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // 1. Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;
    const { error: uploadError } = await supabase.storage
      .from('textbooks')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      setUploading(false);
      return;
    }

    // 2. Add a record to the database
    // We use the original file name for the title for better readability
    const pdfTitle = file.name.replace(/\.pdf$/i, '');
    const { error: insertError } = await supabase
      .from('textbooks')
      .insert({
        user_id: user.id,
        title: pdfTitle,
        file_path: fileName,
      });
      
    if (insertError) {
      console.error('Error inserting textbook record:', insertError);
    } else {
      // 3. Refresh the list to show the new book
      await fetchTextbooks();
    }
    
    setUploading(false);
  };

  const handleAddClick = () => {
    // Trigger the hidden file input
    if (!uploading) {
      fileInputRef.current.click();
    }
  };
  
  const hasTextbooks = textbooks.length > 0;

  if (loading) {
    return <div className="loading-screen">Loading Your Library...</div>;
  }

  return (
    <div className="menu-page">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="application/pdf"
      />
      <div className="menu-header">
        <h1>Your Library</h1>
        <p>Select a textbook to start your interactive learning session.</p>
      </div>
      <div className={`textbook-grid ${!hasTextbooks ? 'empty' : ''}`}>
        {hasTextbooks ? (
          <>
            {textbooks.map((book) => (
              <Link to={`/viewer/${book.id}`} key={book.id} className="textbook-link">
                <TextbookCard textbook={book} />
              </Link>
            ))}
            <AddCard onClick={handleAddClick} isPrimary={false} isLoading={uploading} />
          </>
        ) : (
          <AddCard onClick={handleAddClick} isPrimary={true} isLoading={uploading} />
        )}
      </div>
    </div>
  );
};

export default MenuPage; 