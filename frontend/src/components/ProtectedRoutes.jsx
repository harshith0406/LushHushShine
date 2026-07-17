import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoutes = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="var(--bg-primary)"
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if role is allowed to access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
