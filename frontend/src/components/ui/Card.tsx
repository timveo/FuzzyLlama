import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}) => {
  const baseStyles = 'rounded-xl border transition-all duration-200 bg-light-surface border-light-border dark:bg-dark-surface dark:border-dark-border';

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover
    ? 'cursor-pointer hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-400 hover:-translate-y-1'
    : '';

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
