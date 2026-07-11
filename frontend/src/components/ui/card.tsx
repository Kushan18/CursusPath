import React from 'react';

export const Card = ({ children, className = '', onClick }: any) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`} onClick={onClick}>{children}</div>
);

export const CardHeader = ({ children, className = '' }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }: any) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);

export const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

export const CardDescription = ({ children, className = '' }: any) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
);
