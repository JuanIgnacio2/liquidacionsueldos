import React, { useState } from 'react';
import './ToolTip.scss';

/**
 * Componente ToolTip para mostrar información adicional al hacer hover
 * 
 * @param {string} content - Texto a mostrar en el tooltip
 * @param {string} position - Posición del tooltip: 'top', 'bottom', 'left', 'right'
 * @param {ReactNode} children - Elemento que activará el tooltip al hacer hover
 */
export function Tooltip({ content, position = 'top', children }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`tooltip tooltip-${position}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}

