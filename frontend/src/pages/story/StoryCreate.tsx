// src/pages/story/StoryCreate.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ImageIcon, UserPlus, AtSign } from 'lucide-react';
import { storyApi } from '../../api/story';
import { storyApi as storyFeedApi } from '../../api/story'; // 유저 목록 활용을 위해
import { StoryFeedResponse } from '../../types/story';
import { MediaType } from '../../types/post';

const StoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 태그 관련 상태
  const [taggedUsers, setTaggedUsers] = useState<StoryFeedResponse[]>([]);
  const [availableUsers, setAvailableUsers] = useState<StoryFeedResponse[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 태그 가능한 유저 목록 로드 (피드에 있는 유저들을 활용)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await storyFeedApi.getFeed();
        if (res.resultCode.startsWith('200')) {
          setAvailableUsers(res.data);
        }
      } catch (err) {
        console.error('유저 목록 로드 실패');
      }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const toggleTagUser = (user: StoryFeedResponse) => {
    if (taggedUsers.find(u => u.userId === user.userId)) {
      setTaggedUsers(taggedUsers.filter(u => u.userId !== user.userId));
    } else {
      setTaggedUsers([...taggedUsers, user]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() as MediaType;
      
      const res = await storyApi.createStory({
        file,
        content,
        mediaType: extension,
        taggedUserIds: taggedUsers.map(u => u.userId) // 태그된 유저 ID 전송
      });

      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
        alert('스토리가 생성되었습니다.');
        navigate('/');
      } else {
        alert(`생성 실패: ${res.msg}`);
      }
    } catch (error) {
      console.error('스토리 생성 오류:', error);
      alert('스토리 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', zIndex: 1500, position: 'relative' }}>
      <header style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', borderBottom: '1px solid #efefef' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={28} color="#262626" /></button>
        <strong style={{ fontSize: '1rem', color: '#262626' }}>새 스토리</strong>
        <button onClick={handleSubmit} disabled={!file || isSubmitting} style={{ background: 'none', border: 'none', color: (file && !isSubmitting) ? '#0095f6' : '#8e8e8e', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
          {isSubmitting ? '중...' : '공유'}
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', maxWidth: '400px', aspectRatio: '9/16', backgroundColor: '#fafafa', borderRadius: '12px', border: '2px dashed #dbdbdb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
        >
          {previewUrl ? (
            file?.type.startsWith('video') 
              ? <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
              : <img src={previewUrl} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <div style={{ backgroundColor: '#fff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
                <ImageIcon size={30} color="#8e8e8e" />
              </div>
              <span style={{ fontSize: '1rem', color: '#262626', fontWeight: 'bold' }}>사진 또는 동영상 선택</span>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" style={{ display: 'none' }} />
        </div>

        {/* 문구 및 태그 영역 */}
        <div style={{ width: '100%', maxWidth: '400px', marginTop: '20px' }}>
          <textarea 
            placeholder="스토리에 문구 추가..." 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', height: '60px', border: 'none', borderBottom: '1px solid #efefef', padding: '10px 0', fontSize: '1rem', outline: 'none', resize: 'none' }}
          />
          
          <div style={{ marginTop: '15px' }}>
            <button 
              type="button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fafafa', border: '1px solid #dbdbdb', borderRadius: '20px', padding: '8px 15px', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <UserPlus size={16} /> 사람 태그하기 ({taggedUsers.length})
            </button>

            {showTagMenu && (
              <div style={{ marginTop: '10px', border: '1px solid #efefef', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {availableUsers.map(user => (
                  <div 
                    key={user.userId} 
                    onClick={() => toggleTagUser(user)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid #fafafa', cursor: 'pointer', backgroundColor: taggedUsers.find(u => u.userId === user.userId) ? '#f0faff' : '#fff' }}
                  >
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                      {user.nickname[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.9rem' }}>{user.nickname}</span>
                    {taggedUsers.find(u => u.userId === user.userId) && <AtSign size={14} color="#0095f6" style={{ marginLeft: 'auto' }} />}
                  </div>
                ))}
              </div>
            )}

            {/* 태그된 유저 칩(Chip) 표시 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {taggedUsers.map(user => (
                <div key={user.userId} style={{ backgroundColor: '#0095f6', color: '#fff', padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  @{user.nickname}
                  <X size={12} onClick={() => toggleTagUser(user)} style={{ cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryCreate;
