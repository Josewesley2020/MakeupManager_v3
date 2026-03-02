import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container = ({ children, className = '' }: ContainerProps) => {
  return (
    <div className={`w-full max-w-2xl mx-auto px-2 ${className}`}>
      {children}
    </div>
  );
};
