// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StoryViewer from './pages/story/StoryViewer';
import StoryCreate from './pages/story/StoryCreate';
import StoryArchive from './pages/story/StoryArchive'; // 추가
import DmListPage from './pages/dm/DmListPage';
import DmChatPage from './pages/dm/DmChatPage';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';
import { useAuthStore } from './store/useAuthStore';
import './App.css';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/post/:postId" element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
        <Route path="/story/:userId" element={<PrivateRoute><StoryViewer /></PrivateRoute>} />
        <Route path="/story/create" element={<PrivateRoute><StoryCreate /></PrivateRoute>} />
        <Route path="/story/archive" element={<PrivateRoute><StoryArchive /></PrivateRoute>} />
        <Route path="/dm" element={<PrivateRoute><DmListPage /></PrivateRoute>} />
        <Route path="/dm/:roomId" element={<PrivateRoute><DmChatPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
