import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { useAuthStore } from './store/useAuthStore';
import './App.css';

// 보호된 라우트 컴포넌트 (추후 메인 피드 등 적용)
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h1>환영합니다! 메인 피드가 곧 준비될 예정입니다.</h1>
                <button onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}>로그아웃</button>
              </div>
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
