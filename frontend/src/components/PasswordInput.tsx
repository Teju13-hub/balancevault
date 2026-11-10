import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { InputField } from './InputField';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputField
      label={label}
      type={showPassword ? 'text' : 'password'}
      icon={<Lock className="w-4 h-4" />}
      rightElement={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-secondary-text hover:text-primary-text transition-colors p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-green rounded"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  );
};

