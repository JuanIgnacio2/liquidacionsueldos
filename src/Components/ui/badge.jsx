import React from "react";

export function Badge({ children = '', variant = 'default', ...props }) {
    const getVariantClass = (variant) => {
        switch (variant) {
            case 'secondary':
                return 'badge-secondary';
            case 'outline':
                return 'badge-outline';
            case 'destructive':
                return 'badge-destructive';
            default:
                return 'badge-primary';
        }
    };

    const classes = [
        getVariantClass(variant),
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props} />
    );
}