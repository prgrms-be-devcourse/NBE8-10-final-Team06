// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import BottomNav from '../components/layout/BottomNav';
import { authApi } from '../api/auth';
import { SignupResponse } from '../types/auth';
import { LogOut, User as UserIcon, Settings, Grid, Bookmark, Archive } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { nickname, setLogout } = useAuthStore();
  const [userInfo, setUserInfo] = useState<SignupResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authApi.me();
        if (res.resultCode.startsWith('200')) {
          setUserInfo(res.data);
        }
      } catch (err) {
        console.error('정보 로드 실패');
      }
    };
    fetchMe();
  }, []);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      setLogout();
      navigate('/login');
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px 16px 80px',
      minHeight: '100vh',
      backgroundColor: '#fff'
    }}>
      {/* 상단 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>{userInfo?.nickname || nickname}</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Archive 
            size={24} 
            style={{ cursor: 'pointer' }} 
            onClick={() => navigate('/story/archive')} 
          />
          <Settings size={24} style={{ cursor: 'pointer' }} />
          <LogOut 
            size={24} 
            onClick={handleLogout} 
            style={{ cursor: 'pointer', color: '#ed4956' }} 
          />
        </div>
      </div>

      {/* 프로필 정보 섹션 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        marginBottom: '40px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#fafafa',
          border: '1px solid #dbdbdb',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <UserIcon size={40} color="#dbdbdb" />
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: '700' }}>0</div>
            <div style={{ fontSize: '0.875rem', color: '#8e8e8e' }}>게시물</div>
          </div>
          <div>
            <div style={{ fontWeight: '700' }}>0</div>
            <div style={{ fontSize: '0.875rem', color: '#8e8e8e' }}>팔로워</div>
          </div>
          <div>
            <div style={{ fontWeight: '700' }}>0</div>
            <div style={{ fontSize: '0.875rem', color: '#8e8e8e' }}>팔로잉</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{userInfo?.nickname || nickname}</div>
        <div style={{ fontSize: '0.9rem', color: '#262626' }}>안녕하세요! Devstagram입니다.</div>
      </div>

      {/* 탭 구분선 */}
      <div style={{
        borderTop: '1px solid #dbdbdb',
        display: 'flex',
        justifyContent: 'center',
        gap: '60px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 0',
          borderTop: '1px solid #262626',
          marginTop: '-1px',
          cursor: 'pointer'
        }}>
          <Grid size={12} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px' }}>게시물</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 0',
          color: '#8e8e8e',
          cursor: 'pointer'
        }}>
          <Bookmark size={12} />
          <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px' }}>저장됨</span>
        </div>
      </div>

      <div style={{ marginTop: '60px', textAlign: 'center' }}>
        <p style={{ color: '#8e8e8e' }}>게시물이 없습니다.</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
