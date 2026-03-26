import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { userApi } from '../api/user';
import { postApi } from '../api/post';
import { UserProfileResponse, Resume } from '../types/user';
import { PostFeedProfileRes } from '../types/post';
import { Settings, Grid, Heart, Bookmark, BarChart2, AlertCircle, MessageCircle, LogOut } from 'lucide-react';
import UserListModal from '../components/profile/UserListModal';
import MainLayout from '../components/layout/MainLayout';

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
  const { nickname: myNickname, isLoggedIn, setLogout } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'scraps' | 'tech'>('posts');
  const [scrappedPosts, setScrappedPosts] = useState<PostFeedProfileRes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [modalConfig, setModalConfig] = useState<{ title: string; id: number; type: 'followers' | 'followings' } | null>(null);

  const targetNickname = urlNickname || myNickname;
  const isMe = myNickname === targetNickname;
  const isFetching = useRef(false);

  const fetchProfile = useCallback(async (name: string, force: boolean = false) => {
    if (isFetching.current || (!force && BLACKLIST.has(name))) return;
    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);
      const res = await userApi.getProfile(name);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        setProfile(res.data);
        BLACKLIST.delete(name);
      }
    } catch (err: any) {
      if (err.response?.status === 500) {
        BLACKLIST.add(name);
        setError('백엔드 결함으로 정보를 표시할 수 없습니다.');
      } else {
        setError('프로필 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  const fetchScraps = useCallback(async () => {
    if (!isMe) return;
    try {
      const res = await postApi.getScraps(0);
      if (res.resultCode?.includes('-S-')) {
        const mapped = res.data.content.map((p: any) => ({
          id: p.id, medias: p.medias, techStacks: p.techStacks,
          likeCount: p.likeCount, commentCount: p.commentCount
        }));
        setScrappedPosts(mapped);
      }
    } catch (err) { console.error('스크랩 로드 실패', err); }
  }, [isMe]);

  useEffect(() => {
    if (targetNickname) fetchProfile(targetNickname);
  }, [targetNickname, fetchProfile]);

  useEffect(() => {
    if (isMe && activeTab === 'scraps' && scrappedPosts.length === 0) {
      fetchScraps();
    }
  }, [isMe, activeTab, fetchScraps, scrappedPosts.length]);

  if (loading && !profile) return <MainLayout title={targetNickname || "Profile"}><div style={{ textAlign: 'center' }}>로딩 중...</div></MainLayout>;
  
  if (error) return (
    <MainLayout title="Error">
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <AlertCircle size={48} color="#ed4956" style={{ margin: '0 auto 20px' }} />
        <p>{error}</p>
        <button onClick={() => fetchProfile(targetNickname!, true)} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>다시 시도</button>
      </div>
    </MainLayout>
  );

  if (!profile) return null;

  return (
    <MainLayout title={profile.nickname}>
      <header style={{ display: 'flex', gap: '40px', marginBottom: '44px' }}>
        <img src={profile.profileImageUrl} style={{ width: '150px', height: '150px', borderRadius: '50%', border: '1px solid #dbdbdb', objectFit: 'cover' }} alt="profile" onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '300' }}>{profile.nickname}</span>
            {isMe && <button onClick={() => navigate('/profile/edit')} style={{ padding: '6px 16px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>프로필 편집</button>}
            {isMe && <LogOut size={22} style={{ cursor: 'pointer', color: '#ed4956' }} onClick={() => { setLogout(); navigate('/login'); }} />}
          </div>
          <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
            <span>게시물 <strong>{profile.postCount}</strong></span>
            <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로워', id: profile.userId, type: 'followers' })}>팔로워 <strong>{profile.followerCount}</strong></span>
            <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로잉', id: profile.userId, type: 'followings' })}>팔로잉 <strong>{profile.followingCount}</strong></span>
          </div>
          <div style={{ fontWeight: '600' }}>{profile.nickname}</div>
          <div style={{ color: '#8e8e8e' }}>{RESUME_MAP[profile.resume]}</div>
        </div>
      </header>

      <div style={{ borderTop: '1px solid #dbdbdb', display: 'flex', justifyContent: 'center', gap: '60px' }}>
        <button onClick={() => setActiveTab('posts')} style={{ background: 'none', border: 'none', padding: '15px 0', borderTop: activeTab === 'posts' ? '1px solid #262626' : 'none', marginTop: '-1px', cursor: 'pointer', color: activeTab === 'posts' ? '#262626' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Grid size={12} /> 게시물
        </button>
        <button onClick={() => setActiveTab('tech')} style={{ background: 'none', border: 'none', padding: '15px 0', borderTop: activeTab === 'tech' ? '1px solid #262626' : 'none', marginTop: '-1px', cursor: 'pointer', color: activeTab === 'tech' ? '#262626' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <BarChart2 size={12} /> 기술 레벨
        </button>
        {isMe && <button onClick={() => setActiveTab('scraps')} style={{ background: 'none', border: 'none', padding: '15px 0', borderTop: activeTab === 'scraps' ? '1px solid #262626' : 'none', marginTop: '-1px', cursor: 'pointer', color: activeTab === 'scraps' ? '#262626' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Bookmark size={12} /> 저장됨
        </button>}
      </div>

      <div style={{ marginTop: '20px' }}>
        {/* 게시물 탭 */}
        {activeTab === 'posts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
            {profile.posts.content.map(post => (
              <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} style={{ position: 'relative', aspectRatio: '1/1', backgroundColor: '#efefef', cursor: 'pointer', overflow: 'hidden' }}>
                {post.medias[0] && <img src={post.medias[0].sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: '20px' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={20} fill="white" /> {post.likeCount}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MessageCircle size={20} fill="white" /> {post.commentCount}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 저장됨 탭 */}
        {activeTab === 'scraps' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
            {scrappedPosts.map(post => (
              <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} style={{ aspectRatio: '1/1', backgroundColor: '#efefef', cursor: 'pointer', overflow: 'hidden' }}>
                {post.medias[0] && <img src={post.medias[0].sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />}
              </div>
            ))}
          </div>
        )}

        {/* 기술 레벨 탭 (수정 완료) */}
        {activeTab === 'tech' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 'bold' }}>기술 스택 숙련도</h3>
            {profile.topTechScores && profile.topTechScores.length > 0 ? (
              profile.topTechScores.map(tech => (
                <div key={tech.techName} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <strong>{tech.techName}</strong>
                    <span style={{ color: '#0095f6', fontWeight: 'bold' }}>{tech.score} pt</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#efefef', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min((tech.score / 500) * 100, 100)}%`, 
                      height: '100%', 
                      backgroundColor: '#0095f6',
                      transition: 'width 1s ease-in-out'
                    }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#8e8e8e' }}>아직 활동 데이터가 부족하여 기술 레벨을 산정할 수 없습니다.</p>
                <p style={{ fontSize: '0.8rem', color: '#a8a8a8', marginTop: '10px' }}>게시물을 작성하거나 좋아요를 눌러보세요!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {modalConfig && (
        <UserListModal title={modalConfig.title} id={modalConfig.id} type={modalConfig.type} onClose={() => setModalConfig(null)} />
      )}
    </MainLayout>
  );
};

export default ProfilePage;
