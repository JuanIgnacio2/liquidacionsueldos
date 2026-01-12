import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Clock, Shield } from 'lucide-react';
import '../styles/components/_waitingAuthorization.scss';

const WaitingAuthorization = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const userName = user?.nombre || user?.username || 'Usuario';

  return (
    <div className="waiting-authorization-container">
      <div className="waiting-authorization-content">
        <div className="waiting-logo">
          <img src="/logo192.png" alt="Logo" className="logo-image" />
        </div>
        
        <div className="waiting-message">
          <h1 className="waiting-title">Esperando Autorización</h1>
          <div className="waiting-icon-wrapper">
            <Shield className="waiting-icon" />
          </div>
          <div className="waiting-text">
            <p className="greeting">
              Hola <strong>{userName}</strong>,
            </p>
            <p>
              Tu cuenta ha sido creada exitosamente, pero necesitas ser autorizado por un Administrador 
              para poder comenzar a usar el sistema.
            </p>
            <p>
              Una vez que un Administrador apruebe tu solicitud, recibirás acceso completo a todas las funcionalidades.
            </p>
            <div className="waiting-info">
              <Clock className="info-icon" />
              <span>Tu solicitud está siendo revisada</span>
            </div>
          </div>
        </div>

        <div className="waiting-actions">
          <button 
            className="btn-logout"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="logout-icon" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingAuthorization;

