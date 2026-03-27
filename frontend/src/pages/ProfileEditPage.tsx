import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { userApi } from '../api/user';
import { technologyApi } from '../api/technology';
import { Gender, Resume, ProfileUpdateRequest } from '../types/user';
import { TechTagRes } from '../types/post';
import BottomNav from '../components/layout/BottomNav';
import { ChevronLeft, Camera } from 'lucide-react';
import { applyImageFallback, resolveProfileImageUrl } from '../util/assetUrl';

const RESUME_MAP: Record<Resume, string> = {
  [Resume.UNSPECIFIED]: "미지정",
  [Resume.UNDERGRADUATE]: "학부생",
  [Resume.JUNIOR]: "주니어 개발자",
  [Resume.INTERMEDIATE]: "미들급 개발자",
  [Resume.SENIOR]: "시니어 개발자",
};

const ProfileEditPage: React.FC = () => {
  const { nickname: myNickname } = useAuthStore();
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

  useEffect(() => {
    const fetchData = async () => {
      if (!myNickname) return;
      try {
        setLoading(true);
        // 1. 전체 기술 스택 목록 조회
        const techRes = await technologyApi.getTechnologies();
        if (techRes.resultCode.startsWith('200')) {
          setAllTechs(techRes.data);
        }

        // 2. 현재 프로필 정보 조회
        const res = await userApi.getProfile(myNickname);
        if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
          const d = res.data;
          setForm({
            nickname: d.nickname,
            githubUrl: d.githubUrl || '',
            resume: d.resume || Resume.UNSPECIFIED,
            birthDate: d.birthDate || '',
            gender: d.gender || Gender.MALE,
            techIds: d.techStacks.map(t => t.id)
          });
          setPreview(d.profileImageUrl);
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
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
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        alert('프로필이 수정되었습니다.');
        navigate('/profile');
      } else {
        alert(res.msg || '수정에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('수정 오류:', err);
      const errorMsg = err.response?.data?.msg || '수정 중 오류가 발생했습니다.';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>데이터를 불러오는 중...</div>;

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
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfileEditPage;
