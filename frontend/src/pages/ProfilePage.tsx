// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import BottomNav from '../components/layout/BottomNav';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';
import { SignupResponse } from '../types/auth';
import { LogOut, User as UserIcon, Settings, Grid, Bookmark, Archive } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { nickname, setLogout } = useAuthStore();
  const [userInfo, setUserInfo] = useState<SignupResponse | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const meRes = await authApi.me();
        if (meRes.resultCode.startsWith('200')) {
          setUserInfo(meRes.data);
          const targetId = meRes.data.id;
          const [followerRes, followingRes] = await Promise.all([
            userApi.getFollowerCount(targetId),
            userApi.getFollowingCount(targetId)
          ]);
          if (followerRes.resultCode.startsWith('200')) setFollowerCount(followerRes.data);
          if (followingRes.resultCode.startsWith('200')) setFollowingCount(followingRes.data);
        }
      } catch (err) {
        console.error('프로필 정보 로드 실패:', err);
      }
    };
    fetchProfileData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      setLogout();
      navigate('/login');
    }
  };

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* 상단 헤더 - 935px 고정 */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #dbdbdb',
        zIndex: 900
      }}>
        <div style={{
          maxWidth: '935px',
          margin: '0 auto',
          height: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            letterSpacing: '-0.5px'
          }}>{userInfo?.nickname || nickname}</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Archive size={24} style={{ cursor: 'pointer' }} onClick={() => navigate('/story/archive')} />
            <Settings size={24} style={{ cursor: 'pointer' }} />
            <LogOut size={24} onClick={handleLogout} style={{ cursor: 'pointer', color: '#ed4956' }} />
          </div>
        </div>
      </header>

      <main style={{ 
        maxWidth: '935px', 
        margin: '30px auto 0', 
        padding: '0 20px'
      }}>
        {/* 프로필 상단 정보 - 넓어진 너비에 맞춰 배치 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '100px', // 데스크탑에서 더 넓은 간격
          marginBottom: '44px',
          padding: '0 40px'
        }}>
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            backgroundColor: '#fafafa',
            border: '1px solid #dbdbdb',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <UserIcon size={80} color="#dbdbdb" />
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '300' }}>{userInfo?.nickname || nickname}</span>
              <button style={{ 
                padding: '5px 15px', 
                backgroundColor: '#efefef', 
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '0.9rem', 
                fontWeight: '600',
                cursor: 'pointer'
              }}>프로필 편집</button>
            </div>
            
            <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
              <div style={{ fontSize: '1rem' }}>게시물 <span style={{ fontWeight: '600' }}>0</span></div>
              <div style={{ fontSize: '1rem' }}>팔로워 <span style={{ fontWeight: '600' }}>{followerCount}</span></div>
              <div style={{ fontSize: '1rem' }}>팔로잉 <span style={{ fontWeight: '600' }}>{followingCount}</span></div>
            </div>

            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{userInfo?.nickname || nickname}</div>
            <div style={{ fontSize: '0.95rem', marginTop: '5px' }}>안녕하세요! Devstagram입니다. 👋</div>
          </div>
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
            gap: '8px',
            padding: '15px 0',
            borderTop: '1px solid #262626',
            marginTop: '-1px',
            cursor: 'pointer'
          }}>
            <Grid size={12} />
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>게시물</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '15px 0',
            color: '#8e8e8e',
            cursor: 'pointer'
          }}>
            <Bookmark size={12} />
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>저장됨</span>
          </div>
        </div>

        {/* 빈 콘텐츠 영역 */}
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 10px' }}>아직 게시물이 없습니다.</h3>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
