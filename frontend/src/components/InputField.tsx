import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helperText,
  icon,
  rightElement,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-secondary-text">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-primary-text placeholder:text-secondary-text/60 transition-all duration-200 outline-none
            ${icon ? 'pl-10' : ''}
            ${rightElement ? 'pr-10' : ''}
            ${error
              ? 'border-app-error focus:border-app-error focus:ring-2 focus:ring-app-error/20'
              : 'border-app-border focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 hover:border-secondary-lilac'
            }
            ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-app-error font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-secondary-text">{helperText}</p>}
    </div>
  );
};
