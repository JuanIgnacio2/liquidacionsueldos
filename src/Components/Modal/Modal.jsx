import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.scss';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  showCloseButton = true,
  className = ''
}) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={'modal-overlay'} onClick={onClose}>
      <div 
        className={`${'modal-content'} ${size === 'small' ? 'small' : ''} ${size === 'medium' ? 'medium' : ''} ${size === 'large' ? 'large' : ''} ${size === 'xlarge' ? 'xlarge' : ''} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className={'modal-header'}>
            {title && <h2 className={'modal-title'}>{title}</h2>}
            {showCloseButton && (
              <button
                className={'modal-close-btn'}
                onClick={onClose}
                aria-label="Cerrar modal"
              >
                <X className={'close-icon'} />
              </button>
            )}
          </div>
        )}
        
        <div className={'modal-body'}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`${'modal-footer'} ${className}`}>
      {children}
    </div>
  );
}
