import React, { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';

const App: React.FC = () => {
  const [view, setView] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Devstagram Auth</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setView('LOGIN')}
          style={{ fontWeight: view === 'LOGIN' ? 'bold' : 'normal', marginRight: '10px' }}
        >
          로그인 페이지 보기
        </button>
        <button 
          onClick={() => setView('SIGNUP')}
          style={{ fontWeight: view === 'SIGNUP' ? 'bold' : 'normal' }}
        >
          회원가입 페이지 보기
        </button>
      </div>

      <hr />

      {view === 'LOGIN' ? <LoginPage /> : <SignupPage />}
    </div>
  );
};

export default App;
