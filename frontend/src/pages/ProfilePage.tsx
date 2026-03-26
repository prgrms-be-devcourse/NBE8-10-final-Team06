import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import BottomNav from '../components/layout/BottomNav';
import { userApi } from '../api/user';
import { UserProfileResponse, Resume, Gender, TechScoreDto } from '../types/user';
import { PostFeedProfileRes } from '../types/post';
import { LogOut, Settings, Grid, Github, MessageCircle, Heart, AlertCircle, RefreshCw } from 'lucide-react';

// --- 컴포넌트 외부 메모리에 실패 기록 저장 (컴포넌트가 재생성되어도 유지됨) ---
const FAILED_NICKNAMES = new Set<string>();

const RESUME_MAP: Record<Resume, string> = {
  [Resume.UNSPECIFIED]: "미지정",
  [Resume.UNDERGRADUATE]: "학부생",
  [Resume.JUNIOR]: "주니어 개발자 (1~3년차)",
  [Resume.INTERMEDIATE]: "미들급 개발자 (3~7년차)",
  [Resume.SENIOR]: "시니어 개발자 (7년차+)",
};

const GENDER_MAP: Record<Gender, string> = {
  [Gender.MALE]: "남성",
  [Gender.FEMALE]: "여성",
};

// --- 서브 컴포넌트 생략 (동일 유지) ---
const TechStackSection: React.FC<{ scores: TechScoreDto[] }> = ({ scores }) => {
  if (scores.length === 0) return null;
  return (
    <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#8e8e8e', textTransform: 'uppercase' }}>Top 기술 스택</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {scores.map(tech => (
          <div key={tech.techName} style={{ padding: '6px 12px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
            {tech.techName} <span style={{ color: '#0095f6', marginLeft: '4px' }}>{tech.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const PostItem: React.FC<{ post: PostFeedProfileRes; onClick: (id: number) => void }> = ({ post, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const thumbnail = post.medias[0]?.sourceUrl || '/default-post.png';
  return (
    <div 
      style={{ position: 'relative', aspectRatio: '1/1', backgroundColor: '#efefef', cursor: 'pointer', overflow: 'hidden' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(post.id)}
    >
      <img src={thumbnail} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {isHovered && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={20} fill="white" /> {post.likeCount}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MessageCircle size={20} fill="white" /> {post.commentCount}</div>
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { nickname: urlNickname } = useParams<{ nickname: string }>();
  const { nickname: myNickname, setLogout, isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const targetNickname = urlNickname || myNickname;
  const isMe = myNickname === targetNickname;

  const fetchProfile = useCallback(async (name: string, force: boolean = false) => {
    // 1. 이미 실패한 기록이 있는 닉네임이고, 강제 호출이 아니면 즉시 차단
    if (!force && FAILED_NICKNAMES.has(name)) {
      setError('서버 내부 결함으로 인해 정보를 불러올 수 없는 계정입니다. (관리자 문의 필요)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const res = await userApi.getProfile(name);
      if (res.resultCode.includes('-S-')) {
        setProfile(res.data);
        FAILED_NICKNAMES.delete(name); // 성공 시 실패 기록 삭제
      } else {
        setError(res.msg);
      }
    } catch (err: any) {
      console.error('프로필 데이터 동기화 실패:', err);
      if (err.response?.status === 500) {
        // 2. 500 에러 발생 시 블랙리스트에 추가
        FAILED_NICKNAMES.add(name);
        setError('해당 사용자의 데이터 구조에 백엔드 결함(Lazy Loading)이 있어 정보를 표시할 수 없습니다.');
      } else {
        setError('네트워크 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    if (targetNickname && !profile && !error && !loading) {
      fetchProfile(targetNickname);
    }
  }, [targetNickname, isLoggedIn, navigate, fetchProfile, profile, error, loading]);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      setLogout();
      navigate('/login');
    }
  };

  if (loading && !profile) return <div style={{ padding: '40px', textAlign: 'center', color: '#8e8e8e' }}>서버 데이터 동기화 중...</div>;
  
  if (error) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <AlertCircle size={48} color="#ed4956" style={{ marginBottom: '20px' }} />
      <h3 style={{ marginBottom: '10px' }}>데이터 접근 제한</h3>
      <p style={{ color: '#8e8e8e', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '25px' }}>{error}</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>홈으로 이동</button>
        <button onClick={() => targetNickname && fetchProfile(targetNickname, true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
          <RefreshCw size={16} /> 다시 시도
        </button>
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', paddingBottom: '80px' }}>
      <nav style={{ position: 'sticky', top: 0, backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', zIndex: 100 }}>
        <div style={{ maxWidth: '935px', margin: '0 auto', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>Devstagram</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            {isMe && (
              <>
                <Settings size={22} style={{ cursor: 'pointer' }} />
                <LogOut size={22} style={{ cursor: 'pointer', color: '#ed4956' }} onClick={handleLogout} />
              </>
            )}
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '935px', margin: '30px auto 0', padding: '0 20px' }}>
        <section style={{ display: 'flex', gap: '40px', marginBottom: '44px', alignItems: 'flex-start' }}>
          <img 
            src={profile.profileImageUrl} 
            alt="profile" 
            style={{ width: '150px', height: '150px', borderRadius: '50%', border: '1px solid #dbdbdb', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '300' }}>{profile.nickname}</span>
              {isMe ? (
                <button style={{ padding: '6px 16px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>프로필 편집</button>
              ) : (
                <button style={{ padding: '6px 16px', backgroundColor: profile.isFollowing ? '#efefef' : '#0095f6', color: profile.isFollowing ? 'black' : 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>
                  {profile.isFollowing ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', fontSize: '1rem' }}>
              <span>게시물 <strong>{profile.postCount}</strong></span>
              <span>팔로워 <strong>{profile.followerCount}</strong></span>
              <span>팔로잉 <strong>{profile.followingCount}</strong></span>
            </div>

            <div style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
              <div style={{ fontWeight: '600' }}>{profile.nickname}</div>
              <div style={{ color: '#8e8e8e' }}>
                {RESUME_MAP[profile.resume]} • {GENDER_MAP[profile.gender]}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#8e8e8e' }}>생일: {profile.birthDate}</div>
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00376b', textDecoration: 'none', marginTop: '8px' }}>
                  <Github size={16} /> <strong>Github</strong>
                </a>
              )}
            </div>
          </div>
        </section>

        <TechStackSection scores={profile.topTechScores} />

        <div style={{ borderTop: '1px solid #dbdbdb', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #262626', padding: '12px 0', marginTop: '-11px' }}>
              <Grid size={12} /> <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>게시물</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
            {profile.posts.content.map(post => (
              <PostItem key={post.id} post={post} onClick={(id) => navigate(`/p/${id}`)} />
            ))}
          </div>

          {profile.posts.empty && (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#8e8e8e' }}>
              <Grid size={48} style={{ marginBottom: '10px', opacity: 0.2 }} />
              <p>아직 공유된 게시물이 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
