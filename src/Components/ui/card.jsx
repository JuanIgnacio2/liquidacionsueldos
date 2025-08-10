import React from 'react';

export const Card = React.forwardRef(({className = '', ...props }, ref) => (
    <div
        ref={ref}
        className={`card ${className}`}
        {...props}
    />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef(({className = '', ...props }, ref) => (
    <div
        ref={ref}
        className={`card-header ${className}`}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef(({className = '', ...props }, ref) => (
    <h3
        ref={ref}
        className={`card-title ${className}`}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef(({className = '', ...props }, ref) => (
    <p
        ref={ref}
        className={`card-description ${className}`}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div 
    ref={ref} 
    className={`card-content ${className}`} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center card-content ${className}`}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";