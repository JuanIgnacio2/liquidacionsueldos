import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import './ConfirmDialog.scss';

let confirmId = 0;
let confirmResolve = null;

export const ConfirmDialog = () => {
  const [dialog, setDialog] = React.useState(null);

  useEffect(() => {
    // Función global para mostrar confirmación
    window.showConfirm = (options) => {
      return new Promise((resolve) => {
        const id = ++confirmId;
        const {
          title = 'Confirmar acción',
          message = '¿Está seguro de realizar esta acción?',
          confirmText = 'Confirmar',
          cancelText = 'Cancelar',
          type = 'warning',
          confirmButtonVariant = 'primary',
          cancelButtonVariant = 'secondary'
        } = options;

        setDialog({
          id,
          title,
          message,
          confirmText,
          cancelText,
          type,
          confirmButtonVariant,
          cancelButtonVariant
        });

        confirmResolve = resolve;
      });
    };

    return () => {
      delete window.showConfirm;
    };
  }, []);

  const handleConfirm = () => {
    if (confirmResolve) {
      confirmResolve(true);
      confirmResolve = null;
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }
    setDialog(null);
  };

  const handleEscape = (event) => {
    if (event.key === 'Escape' && dialog) {
      handleCancel();
    }
  };

  useEffect(() => {
    if (dialog) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [dialog]);

  const getIcon = () => {
    const iconSize = 32;
    switch (dialog?.type) {
      case 'danger':
        return <AlertTriangle size={iconSize} className="confirm-icon confirm-icon-danger" />;
      case 'success':
        return <CheckCircle size={iconSize} className="confirm-icon confirm-icon-success" />;
      case 'info':
        return <Info size={iconSize} className="confirm-icon confirm-icon-info" />;
      case 'warning':
      default:
        return <AlertTriangle size={iconSize} className="confirm-icon confirm-icon-warning" />;
    }
  };

  if (!dialog) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="confirm-overlay"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="confirm-dialog"
          data-type={dialog.type}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="confirm-header">
            <div className={`confirm-icon-wrapper confirm-icon-wrapper-${dialog.type}`}>
              {getIcon()}
            </div>
            <h2 className="confirm-title">{dialog.title}</h2>
            <button
              className="confirm-close-btn"
              onClick={handleCancel}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="confirm-body">
            <p className="confirm-message">{dialog.message}</p>
          </div>

          <div className="confirm-footer">
            <button
              className={`btn btn-${dialog.cancelButtonVariant}`}
              onClick={handleCancel}
            >
              {dialog.cancelText}
            </button>
            <button
              className={`btn btn-${dialog.confirmButtonVariant}`}
              onClick={handleConfirm}
            >
              {dialog.confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function for easy use
export const confirmAction = async (options) => {
  if (window.showConfirm) {
    return await window.showConfirm(options);
  }
  return false;
};

