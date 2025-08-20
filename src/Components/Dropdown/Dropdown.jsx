import { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.scss';

export function Dropdown({ trigger, children, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div
        className={styles['dropdown-trigger']}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`${styles['dropdown-content']} ${styles[align]}`}>
      <div className={styles['dropdown-items']}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, icon: Icon, className = '' }) {
  return (
    <button
      className={`${styles['dropdown-item']} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
    >
      {Icon && <Icon className={styles['dropdown-item-icon']} />}
      <span className={styles['dropdown-item-text']}>{children}</span>
    </button>
  );
}