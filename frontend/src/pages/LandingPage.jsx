import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (user) {
      // User is already logged in, go to menu
      navigate('/menu');
      return;
    }

    setIsSigningIn(true);
    try {
      await signIn('google');
      navigate('/menu');
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    // For now, use the same Google OAuth for both sign in and sign up
    // In a real app, you might differentiate these flows
    await handleSignIn();
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Logo */}
        <div className="logo-section">
          <img src="/markitlogonotextpng.png" alt="MarkIt Logo" className="main-logo" />
        </div>
        
        {/* Brand Name */}
        <h1 className="main-title">MarkIt</h1>
        
        {/* Tagline */}
        <p className="main-tagline">Textbooks but <span className="glow-green">better</span></p>
        
        {/* Auth Buttons */}
        <div className="main-auth-buttons">
          <button 
            className="main-auth-btn signin-btn" 
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Connecting...' : (user ? 'Dashboard' : 'sign in')}
          </button>
          <button 
            className="main-auth-btn signup-btn" 
            onClick={handleSignUp}
            disabled={isSigningIn}
          >
            {user ? 'Dashboard' : 'sign up'}
          </button>
        </div>
        
        {/* Textbook Page Element */}
        <div className="textbook-page">
          <div className="textbook-left-page">
          </div>
          <div className="textbook-right-page">
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 