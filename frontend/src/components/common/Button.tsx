// src/components/common/Button.tsx
import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, fullWidth = true, style, ...props }) => {
  return (
    <button
      style={{
        width: fullWidth ? '100%' : 'auto',
        backgroundColor: '#0095f6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px',
        fontWeight: 'bold',
        cursor: 'pointer',
        opacity: props.disabled ? 0.7 : 1,
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};
