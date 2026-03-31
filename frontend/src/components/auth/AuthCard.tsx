// src/components/auth/AuthCard.tsx
import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, footer }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="auth-card">
        <h1 className="logo-text">Devstagram</h1>
        {children}
      </div>
      {footer && <div className="sub-card">{footer}</div>}
    </div>
  );
};
