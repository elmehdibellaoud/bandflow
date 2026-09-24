import React from 'react';
import { Navigate } from 'react-router-dom';
import { useBand } from '../context/BandContext';

/**
 * Route protection wrapper.
 * Redirects to /login if no valid token is found.
 */
export default function ProtectedRoute({ children }) {
  const { token, loading } = useBand();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
