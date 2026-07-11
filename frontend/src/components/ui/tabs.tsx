import React from 'react';

export const Tabs = ({ children, value, onValueChange, defaultValue, className }: any) => {
  const [active, setActive] = React.useState(value || defaultValue);
  const currentVal = value !== undefined ? value : active;
  
  const handleTabChange = (val: string) => {
    setActive(val);
    if (onValueChange) onValueChange(val);
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => 
        React.isValidElement(child) ? React.cloneElement(child, { active: currentVal, setActive: handleTabChange } as any) : child
      )}
    </div>
  );
};

export const TabsList = ({ children, className, active, setActive }: any) => {
  return (
    <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-surface-raised p-1 text-muted ${className || ''}`}>
      {React.Children.map(children, child => 
        React.isValidElement(child) ? React.cloneElement(child, { active, setActive } as any) : child
      )}
    </div>
  );
};

export const TabsTrigger = ({ value, children, className, active, setActive }: any) => {
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive && setActive(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${isActive ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'} ${className || ''}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className, active }: any) => {
  if (active !== value) return null;
  return <div className={`mt-2 ${className || ''}`}>{children}</div>;
};
