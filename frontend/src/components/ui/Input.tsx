import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

    const normalStyles = 'border-light-border bg-light-surface text-light-text-primary placeholder-light-text-muted focus:border-primary-500 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text-primary dark:placeholder-dark-text-muted';

    const errorStyles = 'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-red-900/20 dark:text-red-200';

    const inputStyles = error ? errorStyles : normalStyles;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-light-text-primary dark:text-dark-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${inputStyles} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-light-text-muted dark:text-dark-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
