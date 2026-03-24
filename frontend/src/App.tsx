import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StoryViewer from './pages/story/StoryViewer';
import StoryCreate from './pages/story/StoryCreate';
import DmListPage from './pages/dm/DmListPage';
import DmChatPage from './pages/dm/DmChatPage';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
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
              <HomePage />
            </PrivateRoute>
          } 
        />
        <Route path="/post/:postId" element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
        <Route path="/story/:userId" element={<PrivateRoute><StoryViewer /></PrivateRoute>} />
        <Route path="/story/create" element={<PrivateRoute><StoryCreate /></PrivateRoute>} />
        <Route path="/dm" element={<PrivateRoute><DmListPage /></PrivateRoute>} />
        <Route path="/dm/:roomId" element={<PrivateRoute><DmChatPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
