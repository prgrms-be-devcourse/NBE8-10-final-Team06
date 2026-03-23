import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { getMyInfo, logout } from './api/auth';
import { SignupResponse } from './types/auth';

const App: React.FC = () => {
  const [view, setView] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [user, setUser] = useState<SignupResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // 앱 시작 시 내 정보 조회 (비로그인 시 alert이 뜨지 않도록 처리)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const rsData = await getMyInfo();
        if (rsData.resultCode && rsData.resultCode.includes('-S-')) {
          setUser(rsData.data);
        }
      } catch (e) {
        // 비로그인 상태일 때의 에러는 무시
      } finally {
        setIsChecking(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const rsData = await logout();
    if (rsData.resultCode.includes('-S-')) {
      setUser(null);
      alert('로그아웃 되었습니다.');
    }
  };

  if (isChecking) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>잠시만 기다려주세요...</div>;
  }

  if (user) {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', fontFamily: 'Arial' }}>
        <h1>Devstagram</h1>
        <p>반갑습니다, <strong>{user.nickname}</strong>님!</p>
        <p>({user.email})</p>
        <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>로그아웃</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center' }}>Devstagram</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setView('LOGIN')} 
          style={{ marginRight: '10px', fontWeight: view === 'LOGIN' ? 'bold' : 'normal' }}
        >
          로그인
        </button>
        <button 
          onClick={() => setView('SIGNUP')}
          style={{ fontWeight: view === 'SIGNUP' ? 'bold' : 'normal' }}
        >
          회원가입
        </button>
      </div>
      <hr style={{ marginBottom: '20px' }} />
      {view === 'LOGIN' ? <LoginPage /> : <SignupPage />}
    </div>
  );
};

export default App;
