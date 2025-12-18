import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/authAPI';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authAPI.getToken();
        if (token) {
          const verification = await authAPI.verifyToken();
          if (verification.valid) {
            setIsAuthenticated(true);
            setUser(verification.user || authAPI.getUser());
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      setIsAuthenticated(true);
      setUser(response.user || authAPI.getUser());
      return { success: true, data: response };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al iniciar sesión';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const logout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
