// src/components/AuthButton.jsx
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AuthButton.css'

const AuthButton = () => {
  const { user, loading, signIn, signOut } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleAuth = async () => {
    if (user) {
      // User is logged in, sign them out
      await signOut()
    } else {
      // User is not logged in, sign them in
      setIsSigningIn(true)
      try {
        await signIn('google') // You can change this to 'github', 'email', etc.
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setIsSigningIn(false)
      }
    }
  }

  if (loading) {
    return (
      <button className="auth-button loading" disabled>
        Loading...
      </button>
    )
  }

  return (
    <button 
      className={`auth-button ${isSigningIn ? 'loading' : ''}`}
      onClick={handleAuth}
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <>
          <span className="spinner"></span>
          Connecting...
        </>
      ) : user ? (
        <>
          👋 Welcome, {user.user_metadata?.full_name || user.email}
          <span className="logout-text">(Click to logout)</span>
        </>
      ) : (
        <>
          Login with Google
          <span className="button-arrow"></span>
        </>
      )}
    </button>
  )
}

export default AuthButton