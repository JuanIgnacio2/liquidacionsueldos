import React from "react";

export const Button = React.forwardRef(({
    children,
    variant = 'default',
    size = 'default',
    className = '',
    ...props
}, ref) => {
    const getVariantClass = (variant) => {
        switch (variant) {
            case 'outline':
                return 'btn-outline';
            case 'secondary':
                return 'btn-secondary';
            case 'ghost':
                return 'btn-ghost';
            default:
                return '';
        }
    };

    const getSizeClass = (size) => {
        switch (size) {
            case 'sm':
                return 'btn-sm';
            case 'lg':
                return 'btn-lg';
            default:
                return '';
        }
    };

    const classes = [
        'btn',
        getVariantClass(variant),
        getSizeClass(size),
        className
    ].filter(Boolean).join(' ');

    return (
    <button 
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';