import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { userApi } from '../../api/user';
import { authApi } from '../../api/auth';
import { technologyApi } from '../../api/technology';
import { Gender, Resume, ProfileUpdateRequest } from '../../types/user';
import { TechTagRes } from '../../types/post';
import BottomNav from '../../components/layout/BottomNav';
import { ChevronLeft, Camera } from 'lucide-react';
import { applyImageFallback, resolveProfileImageUrl } from '../../util/assetUrl';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';
import { syncMyProfileImageFromUserApi } from '../../services/syncMyProfileImage';
import { performClientWithdraw } from '../../services/performClientWithdraw';
import { useProfileImageCacheStore } from '../../store/useProfileImageCacheStore';

const RESUME_MAP: Record<Resume, string> = {
  [Resume.UNSPECIFIED]: "미지정",
  [Resume.UNDERGRADUATE]: "학부생",
  [Resume.JUNIOR]: "주니어 개발자",
  [Resume.INTERMEDIATE]: "미들급 개발자",
  [Resume.SENIOR]: "시니어 개발자",
};

const ProfileEditPage: React.FC = () => {
  const { nickname: myNickname, userId: myUserId, setSessionNickname } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<ProfileUpdateRequest>({
    nickname: '',
    githubUrl: '',
    resume: Resume.UNSPECIFIED,
    birthDate: '',
    gender: Gender.MALE,
    techIds: []
  });
  
  const [allTechs, setAllTechs] = useState<TechTagRes[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!myNickname) return;
      setLoadError(null);
      try {
        setLoading(true);
        try {
          const techRes = await technologyApi.getTechnologies();
          if (isRsDataSuccess(techRes)) {
            setAllTechs(Array.isArray(techRes.data) ? techRes.data : []);
          }
        } catch {
          setAllTechs([]);
        }

        try {
          const meRes = await authApi.me();
          if (isRsDataSuccess(meRes) && meRes.data?.email) {
            setAccountEmail(meRes.data.email.trim());
          }
        } catch {
          setAccountEmail('');
        }

        const res = await userApi.getProfile(myNickname);
        if (isRsDataSuccess(res)) {
          const d = res.data;
          if (!d) {
            setLoadError('프로필 데이터가 비어 있습니다.');
            return;
          }
          const stacks = Array.isArray(d.techStacks) ? d.techStacks : [];
          setForm({
            nickname: d.nickname ?? '',
            githubUrl: d.githubUrl || '',
            resume: d.resume || Resume.UNSPECIFIED,
            birthDate: d.birthDate || '',
            gender: d.gender || Gender.MALE,
            techIds: stacks.map((t) => t.id),
          });
          setPreview(d.profileImageUrl ?? null);
          useProfileImageCacheStore.getState().setAuthoritativeProfileImage(
            d.userId,
            d.profileImageUrl ?? null
          );
        } else {
          setLoadError(res.msg || '프로필을 불러오지 못했습니다.');
        }
      } catch (err: unknown) {
        setLoadError(getApiErrorMessage(err, '프로필을 불러오지 못했습니다.'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [myNickname]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const toggleTech = (techId: number) => {
    setForm(prev => ({
      ...prev,
      techIds: prev.techIds.includes(techId)
        ? prev.techIds.filter(id => id !== techId)
        : [...prev.techIds, techId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await userApi.updateProfile(form, profileImage || undefined);
      if (isRsDataSuccess(res)) {
        const nextNick = form.nickname.trim();
        await syncMyProfileImageFromUserApi({ force: true, nicknameOverride: nextNick });
        if (myUserId != null && nextNick && nextNick !== myNickname?.trim()) {
          setSessionNickname(nextNick);
        }
        alert('프로필이 수정되었습니다.');
        navigate('/profile');
      } else {
        alert(res.msg || '수정에 실패했습니다.');
      }
    } catch (err: unknown) {
      console.error('수정 오류:', err);
      alert(getApiErrorMessage(err, '수정 중 오류가 발생했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>데이터를 불러오는 중...</div>;

  if (loadError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', maxWidth: '400px', margin: '40px auto' }}>
        <p style={{ color: '#ed4956', marginBottom: '16px' }}>{loadError}</p>
        <p style={{ fontSize: '0.85rem', color: '#8e8e8e', marginBottom: '20px' }}>
          로그인한 닉네임과 DB에 있는 사용자가 일치하는지 확인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0095f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          내 프로필로
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      <header style={{ height: '50px', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', padding: '0 15px', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', marginRight: '28px' }}>프로필 편집</h2>
      </header>

      <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ position: 'relative' }}>
              <img 
                src={resolveProfileImageUrl(preview)} 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbdbdb' }} 
                alt="preview" 
                onError={(e) => applyImageFallback(e, preview)}
              />
              <label style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0095f6', color: '#fff', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}>
                <Camera size={14} />
                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
            <span style={{ color: '#0095f6', fontWeight: '600', fontSize: '0.85rem', marginTop: '10px' }}>프로필 사진 바꾸기</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>닉네임</label>
            <input 
              type="text" 
              value={form.nickname} 
              onChange={e => setForm({...form, nickname: e.target.value})}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #dbdbdb', padding: '8px 0', outline: 'none' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>Github URL</label>
            <input 
              type="url" 
              value={form.githubUrl} 
              onChange={e => setForm({...form, githubUrl: e.target.value})}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #dbdbdb', padding: '8px 0', outline: 'none' }}
              placeholder="https://github.com/your-id"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>생년월일</label>
            <input 
              type="date" 
              value={form.birthDate} 
              onChange={e => setForm({...form, birthDate: e.target.value})}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #dbdbdb', padding: '8px 0', outline: 'none' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>성별</label>
            <select 
              value={form.gender} 
              onChange={e => setForm({...form, gender: e.target.value as Gender})}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #dbdbdb', padding: '8px 0', outline: 'none', background: 'none' }}
            >
              <option value={Gender.MALE}>남성</option>
              <option value={Gender.FEMALE}>여성</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>경력</label>
            <select 
              value={form.resume} 
              onChange={e => setForm({...form, resume: e.target.value as Resume})}
              style={{ width: '100%', border: 'none', borderBottom: '1px solid #dbdbdb', padding: '8px 0', outline: 'none', background: 'none' }}
            >
              {Object.keys(RESUME_MAP).map((key) => (
                <option key={key} value={key}>{RESUME_MAP[key as Resume]}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ fontSize: '0.8rem', color: '#8e8e8e', fontWeight: 'bold' }}>기술 스택</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {allTechs.map(tech => {
                const isSelected = form.techIds.includes(tech.id);
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => toggleTech(tech.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: `1px solid ${tech.color}`,
                      backgroundColor: isSelected ? tech.color : '#fff',
                      color: isSelected ? '#fff' : tech.color,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tech.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0095f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? '저장 중...' : '완료'}
          </button>
        </form>

        <section
          style={{
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid #efefef',
          }}
          aria-labelledby="withdraw-section-title"
        >
          <h3 id="withdraw-section-title" style={{ fontSize: '0.85rem', color: '#ed4956', fontWeight: 600, marginBottom: '8px' }}>
            위험 구역
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#8e8e8e', marginBottom: '12px' }}>
            탈퇴 시 계정과 관련된 데이터는 복구할 수 없을 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setWithdrawPassword('');
              setShowWithdrawModal(true);
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#fff',
              color: '#ed4956',
              border: '1px solid #ed4956',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            회원 탈퇴
          </button>
        </section>
      </main>

      {showWithdrawModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !withdrawing) {
              setShowWithdrawModal(false);
              setWithdrawPassword('');
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="withdraw-modal-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              회원 탈퇴
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#262626', marginBottom: '12px', lineHeight: 1.5 }}>
              정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <p style={{ fontSize: '0.8rem', color: '#8e8e8e', marginBottom: '8px' }}>
              계속하려면 <strong>로그인 비밀번호</strong>를 입력해 본인 확인을 완료하세요.
            </p>
            {!accountEmail && (
              <p style={{ fontSize: '0.8rem', color: '#ed4956', marginBottom: '8px' }}>
                계정 이메일을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.
              </p>
            )}
            <input
              type="password"
              value={withdrawPassword}
              onChange={(e) => setWithdrawPassword(e.target.value)}
              placeholder="비밀번호"
              disabled={withdrawing || !accountEmail}
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px',
                border: '1px solid #dbdbdb',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '0.9rem',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={withdrawing}
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawPassword('');
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '4px',
                  background: '#fff',
                  cursor: withdrawing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={withdrawing || !accountEmail || withdrawPassword.length === 0}
                onClick={async () => {
                  if (!accountEmail) return;
                  const pwd = withdrawPassword;
                  if (!pwd) return;
                  setWithdrawing(true);
                  try {
                    const loginRes = await authApi.login({ email: accountEmail, password: pwd });
                    if (!isRsDataSuccess(loginRes)) {
                      alert(loginRes.msg || '비밀번호가 올바르지 않습니다.');
                      return;
                    }
                    await performClientWithdraw(navigate);
                  } catch (err: unknown) {
                    alert(getApiErrorMessage(err, '비밀번호 확인에 실패했습니다.'));
                  } finally {
                    setWithdrawing(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#ed4956',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: withdrawing || !accountEmail || withdrawPassword.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: !accountEmail || withdrawPassword.length === 0 ? 0.5 : 1,
                }}
              >
                {withdrawing ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default ProfileEditPage;
