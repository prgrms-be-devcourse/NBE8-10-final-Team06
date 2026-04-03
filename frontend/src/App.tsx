// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoggedInProfileSync from './components/layout/LoggedInProfileSync';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StoryViewer from './pages/story/StoryViewer';
import StoryCreate from './pages/story/StoryCreate';
import StoryArchive from './pages/story/StoryArchive';
import ArchivedStoryViewer from './pages/story/ArchivedStoryViewer';
import DmListPage from './pages/dm/DmListPage';
import DmChatPage from './pages/dm/DmChatPage';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import PostCreatePage from './pages/PostCreatePage';
import PostEditPage from './pages/PostEditPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import SearchPage from './pages/SearchPage';
import TechManagePage from './pages/technology/TechManagePage';
import TechCategoryManagePage from './pages/technology/TechCategoryManagePage';
import { useAuthStore } from './store/useAuthStore';
import { authApi } from './api/auth';
import { isRsDataSuccess } from './util/rsData';
import './App.css';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const authReady = useAuthStore((state) => state.authReady);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  if (!authReady) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#8e8e8e' }}>로딩 중…</div>;
  }
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

/** 쿠키 세션 확인 후 authReady 설정 — 보호 라우트가 persist 만으로 오판하지 않게 함 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.me();
        if (cancelled) return;
        if (isRsDataSuccess(res) && res.data) {
          const { id, nickname, profileImageUrl } = res.data;
          useAuthStore.getState().setLogin(nickname, id, profileImageUrl ?? null);
        }
      } catch {
        /* 401·refresh 실패 시 인터셉터가 로그인 이동할 수 있음 */
      } finally {
        if (!cancelled) {
          useAuthStore.setState({ authReady: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <>{children}</>;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthBootstrap>
        <LoggedInProfileSync />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />

          <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />

          <Route path="/post/create" element={<PrivateRoute><PostCreatePage /></PrivateRoute>} />
          <Route path="/post/:postId" element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
          <Route path="/post/:postId/edit" element={<PrivateRoute><PostEditPage /></PrivateRoute>} />

          <Route path="/story/create" element={<PrivateRoute><StoryCreate /></PrivateRoute>} />
          <Route path="/story/archive/:storyId" element={<PrivateRoute><ArchivedStoryViewer /></PrivateRoute>} />
          <Route path="/story/archive" element={<PrivateRoute><StoryArchive /></PrivateRoute>} />
          <Route path="/story/:userId" element={<PrivateRoute><StoryViewer /></PrivateRoute>} />

          <Route path="/dm" element={<PrivateRoute><DmListPage /></PrivateRoute>} />
          <Route path="/dm/:roomId" element={<PrivateRoute><DmChatPage /></PrivateRoute>} />

          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/:nickname" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/profile/edit" element={<PrivateRoute><ProfileEditPage /></PrivateRoute>} />

          <Route path="/technologies/manage" element={<PrivateRoute><TechManagePage /></PrivateRoute>} />
          <Route path="/technologies/categories/manage" element={<PrivateRoute><TechCategoryManagePage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthBootstrap>
    </Router>
  );
}

export default App;
