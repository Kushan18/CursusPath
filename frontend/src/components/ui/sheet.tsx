import React from 'react';

export const Sheet = ({ children, open, onOpenChange }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => onOpenChange(false)}>
      {children}
    </div>
  );
};

export const SheetContent = ({ children, className = '' }: any) => (
  <div className={`fixed inset-y-0 right-0 z-50 h-full w-3/4 border-l bg-background p-6 shadow-lg sm:max-w-sm transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[400px] ${className}`} onClick={e => e.stopPropagation()}>
    {children}
  </div>
);

export const SheetHeader = ({ children, className = '' }: any) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}>{children}</div>
);

export const SheetTitle = ({ children, className = '' }: any) => (
  <div className={`text-lg font-semibold text-foreground ${className}`}>{children}</div>
);

export const SheetDescription = ({ children, className = '' }: any) => (
  <div className={`text-sm text-muted-foreground ${className}`}>{children}</div>
);
