import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BandProvider } from './context/BandContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Launchpad from './pages/Launchpad';
import Dashboard from './pages/Dashboard';

/**
 * Main App Router.
 * Configures auth/public redirects and wraps navigation in BandProvider.
 */
export default function App() {
  return (
    <BrowserRouter>
      <BandProvider>
        <Routes>
          {/* Public Views */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Views */}
          <Route 
            path="/launchpad" 
            element={
              <ProtectedRoute>
                <Launchpad />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Root/Fallback redirection */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BandProvider>
    </BrowserRouter>
  );
}
