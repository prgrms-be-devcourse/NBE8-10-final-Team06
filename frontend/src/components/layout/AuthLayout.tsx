import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col items-center justify-center min-height-[100vh] bg-[#fafafa] p-4">
      <div className="w-full max-width-[350px] bg-white border border-[#dbdbdb] p-8 text-center flex flex-col gap-6">
        <h1 className="logo-text text-4xl mb-2">Devstagram</h1>
        {children}
      </div>
    </div>
  );
};
