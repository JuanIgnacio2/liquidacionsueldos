import React from 'react';
import './LoadingSpinner.scss';

/**
 * Componente de spinner de carga reutilizable
 * 
 * @param {string} message - Mensaje opcional a mostrar junto al spinner
 * @param {string} size - Tamaño del spinner: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} className - Clases CSS adicionales
 */
export const LoadingSpinner = ({ message = 'Cargando...', size = 'md', className = '', overlay = false }) => {
  return (
    <div className={`loading-spinner-container ${overlay ? 'loading-spinner-overlay' : ''} ${className}`}>
      <div className={`loading-spinner ${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';