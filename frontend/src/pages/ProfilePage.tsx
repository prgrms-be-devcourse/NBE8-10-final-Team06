import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import BottomNav from '../components/layout/BottomNav';
import { userApi } from '../api/user';
import { postApi } from '../api/post';
import { UserProfileResponse, Resume } from '../types/user';
import { PostFeedProfileRes } from '../types/post';
import { LogOut, Settings, Grid, Github, MessageCircle, Heart, Bookmark, Camera, AlertCircle } from 'lucide-react';
import UserListModal from '../components/profile/UserListModal';

const RESUME_MAP: Record<Resume, string> = {
  [Resume.UNSPECIFIED]: "미지정",
  [Resume.UNDERGRADUATE]: "학부생",
  [Resume.JUNIOR]: "주니어 개발자",
  [Resume.INTERMEDIATE]: "미들급 개발자",
  [Resume.SENIOR]: "시니어 개발자",
};

const BLACKLIST = new Set<string>();

const ProfilePage: React.FC = () => {
  const { nickname: urlNickname } = useParams<{ nickname: string }>();
  const { nickname: myNickname, setLogout, isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'scraps'>('posts');
  const [scrappedPosts, setScrappedPosts] = useState<PostFeedProfileRes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 모달 상태
  const [modalConfig, setModalConfig] = useState<{ title: string; type: 'followers' | 'followings' } | null>(null);

  const targetNickname = urlNickname || myNickname;
  const isMe = myNickname === targetNickname;
  const isFetching = useRef(false);

  const fetchProfile = useCallback(async (name: string, force: boolean = false) => {
    if (isFetching.current || (!force && BLACKLIST.has(name))) {
      if (BLACKLIST.has(name)) setError('백엔드 서버 결함으로 인해 정보를 불러올 수 없는 계정입니다.');
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);
      const res = await userApi.getProfile(name);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        setProfile(res.data);
        BLACKLIST.delete(name);
      } else {
        setError(res.msg || '프로필 로드 실패');
      }
    } catch (err: any) {
      console.error('프로필 로드 오류:', err);
      if (err.response?.status === 500) {
        BLACKLIST.add(name);
        setError('해당 사용자의 데이터 구조에 백엔드 결함이 있어 정보를 표시할 수 없습니다.');
      } else {
        setError('프로필 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  const fetchScaps = useCallback(async () => {
    if (!isMe || isFetching.current) return;
    try {
      const res = await postApi.getScraps(0);
      if (res.resultCode?.includes('-S-')) {
        const mapped = res.data.content.map(p => ({
          id: p.id, medias: p.medias, techStacks: p.techStacks,
          likeCount: p.likeCount, commentCount: p.commentCount
        }));
        setScrappedPosts(mapped);
      }
    } catch (err) { console.error('스크랩 로드 실패', err); }
  }, [isMe]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (targetNickname) {
      fetchProfile(targetNickname);
    }
  }, [targetNickname, isLoggedIn, navigate, fetchProfile]);

  useEffect(() => {
    if (isMe && activeTab === 'scraps' && scrappedPosts.length === 0) {
      fetchScaps();
    }
  }, [isMe, activeTab, fetchScaps, scrappedPosts.length]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      const apiCall = profile.isFollowing ? userApi.unfollow : userApi.follow;
      const res = await apiCall(profile.nickname);
      if (res.resultCode.includes('-S-')) {
        setProfile(prev => prev ? ({
          ...prev,
          isFollowing: !prev.isFollowing,
          followerCount: prev.isFollowing ? prev.followerCount - 1 : prev.followerCount + 1
        }) : null);
      }
    } catch (err) {
      alert('팔로우 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading && !profile) return <div style={{ padding: '40px', textAlign: 'center' }}>데이터 동기화 중...</div>;
  
  if (error) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <AlertCircle size={48} color="#ed4956" style={{ marginBottom: '20px' }} />
      <p style={{ color: '#ed4956', marginBottom: '20px' }}>{error}</p>
      <button onClick={() => fetchProfile(targetNickname!, true)} style={{ padding: '8px 16px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>다시 시도</button>
    </div>
  );

  if (!profile) return null;

  const displayPosts = activeTab === 'posts' ? profile.posts.content : scrappedPosts;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', paddingBottom: '80px' }}>
      <nav style={{ position: 'sticky', top: 0, backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', zIndex: 100 }}>
        <div style={{ maxWidth: '935px', margin: '0 auto', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>Devstagram</h2>
          <LogOut size={22} style={{ cursor: 'pointer', color: '#ed4956' }} onClick={() => { setLogout(); navigate('/login'); }} />
        </div>
      </nav>

      <main style={{ maxWidth: '935px', margin: '30px auto 0', padding: '0 20px' }}>
        <header style={{ display: 'flex', gap: '40px', marginBottom: '44px' }}>
          <img src={profile.profileImageUrl} style={{ width: '150px', height: '150px', borderRadius: '50%', border: '1px solid #dbdbdb', objectFit: 'cover' }} alt="profile" onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '300' }}>{profile.nickname}</span>
              {isMe ? (
                <button onClick={() => navigate('/profile/edit')} style={{ padding: '6px 16px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>프로필 편집</button>
              ) : (
                <button onClick={handleFollowToggle} style={{ padding: '6px 16px', backgroundColor: profile.isFollowing ? '#efefef' : '#0095f6', color: profile.isFollowing ? 'black' : 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>
                  {profile.isFollowing ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
              <span>게시물 <strong>{profile.postCount}</strong></span>
              <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로워', type: 'followers' })}>팔로워 <strong>{profile.followerCount}</strong></span>
              <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로잉', type: 'followings' })}>팔로잉 <strong>{profile.followingCount}</strong></span>
            </div>
            
            <div style={{ fontWeight: '600' }}>{profile.nickname}</div>
            <div style={{ color: '#8e8e8e' }}>{RESUME_MAP[profile.resume]}</div>
          </div>
        </header>

        {/* 탭 및 그리드 영역 생략 (동일 유지) */}
        <div style={{ borderTop: '1px solid #dbdbdb', display: 'flex', justifyContent: 'center', gap: '60px' }}>
          <button onClick={() => setActiveTab('posts')} style={{ background: 'none', border: 'none', padding: '15px 0', borderTop: activeTab === 'posts' ? '1px solid #262626' : 'none', marginTop: '-1px', cursor: 'pointer', color: activeTab === 'posts' ? '#262626' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.75rem' }}>
            <Grid size={12} style={{ marginRight: '5px' }} /> 게시물
          </button>
          {isMe && <button onClick={() => setActiveTab('scraps')} style={{ background: 'none', border: 'none', padding: '15px 0', borderTop: activeTab === 'scraps' ? '1px solid #262626' : 'none', marginTop: '-1px', cursor: 'pointer', color: activeTab === 'scraps' ? '#262626' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.75rem' }}>
            <Bookmark size={12} style={{ marginRight: '5px' }} /> 저장됨
          </button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', marginTop: '10px' }}>
          {displayPosts.map(post => (
            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} style={{ position: 'relative', aspectRatio: '1/1', backgroundColor: '#efefef', cursor: 'pointer', overflow: 'hidden' }}>
              {post.medias[0] && <img src={post.medias[0].sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />}
            </div>
          ))}
        </div>
      </main>

      {/* 팔로워/팔로잉 모달 */}
      {modalConfig && (
        <UserListModal 
          title={modalConfig.title} 
          userId={profile.userId} 
          type={modalConfig.type} 
          onClose={() => setModalConfig(null)} 
        />
      )}

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
