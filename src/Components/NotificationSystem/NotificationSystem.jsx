import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './NotificationSystem.scss';

let notificationId = 0;
const MAX_STACK = 5;

export const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    // Función global para agregar notificaciones
    window.showNotification = (message, type = 'info', duration = 4000) => {
      const id = ++notificationId;

    setNotifications(prev => {
      // 👉 limitar stack: eliminar la más vieja si supero MAX_STACK
      let updated = [ { id, message, type, duration }, ...prev ];

      if (updated.length > MAX_STACK) {
        updated = updated.slice(0, MAX_STACK);
      }
      return updated;
    });

      
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    };

    return () => {
      delete window.showNotification;
    };
  }, []);

  const getIcon = (type) => {
    const iconSize = 20;
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} className="notification-icon" />;
      case 'error':
        return <AlertCircle size={iconSize} className="notification-icon" />;
      case 'warning':
        return <AlertTriangle size={iconSize} className="notification-icon" />;
      case 'info':
      default:
        return <Info size={iconSize} className="notification-icon" />;
    }
  };

  return (
    <div className="notification-container">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              delay: index * 0.1
            }}
            className={`notification notification-${notification.type}`}
          >
            <div className="notification-content">
              {getIcon(notification.type)}
              <span className="notification-message">{notification.message}</span>
            </div>
            <button 
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Cerrar notificación"
            >
              <X size={16} className="close-icon" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Helper functions for easy use
export const showSuccess = (message, duration = 4000) => {
  if (window.showNotification) {
    window.showNotification(message, 'success', duration);
  }
};

export const showError = (message, duration = 4000) => {
  if (window.showNotification) {
    window.showNotification(message, 'error', duration);
  }
};

export const showInfo = (message, duration = 4000) => {
  if (window.showNotification) {
    window.showNotification(message, 'info', duration);
  }
};

export const showWarning = (message, duration = 4000) => {
  if (window.showNotification) {
    window.showNotification(message, 'warning', duration);
  }
};