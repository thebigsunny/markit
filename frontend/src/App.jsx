import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import MenuPage from './pages/MenuPage'
import ViewerPage from './pages/ViewerPage'
import './App.css'

// A protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" />
}

// This component decides which page to show
const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    // You can add a more sophisticated loading spinner here
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/menu" /> : <LandingPage />} />
      <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
      <Route path="/viewer/:id" element={<ProtectedRoute><ViewerPage /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App 