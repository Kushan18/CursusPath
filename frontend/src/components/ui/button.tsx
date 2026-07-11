import React from 'react';

export const Button = React.forwardRef<HTMLButtonElement, any>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button";
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button"
