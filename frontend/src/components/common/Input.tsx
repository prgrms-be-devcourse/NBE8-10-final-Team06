// src/components/common/Input.tsx
import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, ...props }) => {
  return (
    <div style={{ width: '100%', marginBottom: '10px' }}>
      <input
        style={{
          width: '100%',
          padding: '10px',
          border: `1px solid ${error ? '#ed4956' : '#dbdbdb'}`,
          borderRadius: '3px',
          backgroundColor: '#fafafa',
          fontSize: '0.8rem',
          boxSizing: 'border-box'
        }}
        {...props}
      />
      {error && <span style={{ color: '#ed4956', fontSize: '0.7rem', display: 'block', textAlign: 'left', marginTop: '2px' }}>{error}</span>}
    </div>
  );
};
