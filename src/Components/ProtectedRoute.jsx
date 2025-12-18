import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirige a /login si el usuario no está autenticado
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
