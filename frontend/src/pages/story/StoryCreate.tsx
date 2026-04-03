// src/pages/story/StoryCreate.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ImageIcon, UserPlus, AtSign, ArrowLeft } from 'lucide-react';
import { storyApi } from '../../api/story';
import { StoryFeedResponse } from '../../types/story';
import { MediaType } from '../../types/post';
import BottomNav from '../../components/layout/BottomNav';

const StoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  
  const [taggedUsers, setTaggedUsers] = useState<StoryFeedResponse[]>([]);
  const [availableUsers, setAvailableUsers] = useState<StoryFeedResponse[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await storyApi.getFeed();
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
      setThumbnailUrl('');
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const isVideoMedia = file?.type.startsWith('video') === true;

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
        tagUserIds: taggedUsers.map((u) => u.userId),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      });

      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
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
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
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
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={24} color="#262626" />
          </button>
          <strong style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>새 스토리</strong>
          <button 
            onClick={handleSubmit} 
            disabled={!file || isSubmitting} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: (file && !isSubmitting) ? '#0095f6' : '#8e8e8e', 
              fontWeight: 'bold', 
              fontSize: '1rem', 
              cursor: 'pointer' 
            }}
          >
            {isSubmitting ? '공유 중' : '공유'}
          </button>
        </div>
      </header>

      <main style={{ 
        maxWidth: '935px', 
        margin: '30px auto 0', 
        display: 'flex',
        justifyContent: 'center',
        padding: '0 20px'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '600px', 
          backgroundColor: '#fff', 
          border: '1px solid #dbdbdb', 
          borderRadius: '3px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* 업로드 영역 */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              width: '100%', 
              maxWidth: '350px', 
              aspectRatio: '9/16', 
              backgroundColor: '#fafafa', 
              borderRadius: '8px', 
              border: '1px solid #dbdbdb', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              overflow: 'hidden', 
              position: 'relative' 
            }}
          >
            {previewUrl ? (
              file?.type.startsWith('video') 
                ? <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
                : <img src={previewUrl} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <ImageIcon size={48} color="#dbdbdb" style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '1.1rem', color: '#262626', fontWeight: '500' }}>사진이나 동영상을 여기에 끌어다 놓으세요</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" style={{ display: 'none' }} />
          </div>

          <div style={{ width: '100%', maxWidth: '350px', marginTop: '30px' }}>
            <textarea 
              placeholder="문구 입력..." 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              style={{ 
                width: '100%', 
                height: '100px', 
                border: '1px solid #dbdbdb', 
                borderRadius: '4px',
                padding: '12px', 
                fontSize: '1rem', 
                outline: 'none', 
                resize: 'none'
              }}
            />

            {isVideoMedia && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.75rem', color: '#8e8e8e', display: 'block', marginBottom: '6px' }}>
                  썸네일 URL (선택)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #dbdbdb',
                    borderRadius: '4px',
                    padding: '10px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            )}
            
            <button 
              type="button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              style={{ 
                marginTop: '15px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: '#fff', 
                border: '1px solid #dbdbdb', 
                borderRadius: '4px', 
                padding: '10px', 
                fontSize: '0.9rem', 
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <UserPlus size={18} /> 사람 태그하기 ({taggedUsers.length})
            </button>
            
            {taggedUsers.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {taggedUsers.map((u) => (
                  <span
                    key={u.userId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid #dbdbdb',
                      borderRadius: '12px',
                      padding: '4px 8px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <AtSign size={12} />
                    {u.nickname}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleTagUser(u)} />
                  </span>
                ))}
              </div>
            )}

            {showTagMenu && (
              <div
                style={{
                  marginTop: '10px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backgroundColor: '#fff'
                }}
              >
                {availableUsers.length === 0 ? (
                  <div style={{ padding: '10px', color: '#8e8e8e', fontSize: '0.85rem' }}>태그 가능한 사용자가 없습니다.</div>
                ) : (
                  availableUsers.map((user) => {
                    const selected = taggedUsers.some((u) => u.userId === user.userId);
                    return (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => toggleTagUser(user)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px',
                          border: 'none',
                          borderBottom: '1px solid #f0f0f0',
                          background: selected ? '#f5faff' : '#fff',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {selected ? '✓ ' : ''}{user.nickname}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default StoryCreate;
