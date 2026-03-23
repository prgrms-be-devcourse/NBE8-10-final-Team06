import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StoryViewer from './pages/story/StoryViewer';
import StoryCreate from './pages/story/StoryCreate';
import StoryBar from './components/story/StoryBar';
import { useAuthStore } from './store/useAuthStore';
import './App.css';

// 보호된 라우트 컴포넌트
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
              <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                <StoryBar />
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h1>환영합니다!</h1>
                  <button onClick={() => window.location.href = '/story/create'}>스토리 올리기</button>
                  <button onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }} style={{ marginLeft: '10px' }}>로그아웃</button>
                </div>
              </div>
            </PrivateRoute>
          } 
        />
        <Route path="/story/:userId" element={<PrivateRoute><StoryViewer /></PrivateRoute>} />
        <Route path="/story/create" element={<PrivateRoute><StoryCreate /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
