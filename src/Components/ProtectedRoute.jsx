import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario es NEW_USER
  const userRole = user?.userRol || user?.rol || user?.role || user?.rolUsuario;
  const isWaitingPage = location.pathname === '/espera-autorizacion';
  
  // Si es NEW_USER y NO está en la página de espera, redirigir
  if (userRole === 'NEW_USER' && !isWaitingPage) {
    return <Navigate to="/espera-autorizacion" replace />;
  }

  // Si es NEW_USER y está en la página de espera, permitir acceso
  // Si no es NEW_USER, permitir acceso normal
  return children;
};

export default ProtectedRoute;

