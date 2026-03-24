import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { storyApi } from '../../api/story';
import { MediaType } from '../../types/post';

const StoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // 미리보기 URL 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
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
      // 확장자 추출 (예: image/jpeg -> jpeg)
      const extension = file.name.split('.').pop()?.toLowerCase() as MediaType;
      
      const res = await storyApi.createStory({
        file,
        content,
        mediaType: extension,
        taggedUserIds: []
      });

      if (res.resultCode.includes('-S-')) {
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
    <div style={{ 
      height: '100vh', 
      backgroundColor: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 1500,
      position: 'relative'
    }}>
      {/* 헤더 */}
      <header style={{ 
        height: '50px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 15px',
        borderBottom: '1px solid #efefef'
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={28} color="#262626" />
        </button>
        <strong style={{ fontSize: '1rem', color: '#262626' }}>새 스토리</strong>
        <button 
          onClick={handleSubmit} 
          disabled={!file || isSubmitting}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: (file && !isSubmitting) ? '#0095f6' : '#8e8e8e', 
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer'
          }}
        >
          {isSubmitting ? '중...' : '공유'}
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 파일 선택 영역 */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: '100%', 
            maxWidth: '400px', 
            aspectRatio: '9/16', 
            backgroundColor: '#fafafa', 
            borderRadius: '12px', 
            border: '2px dashed #dbdbdb',
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
            file?.type.startsWith('video') ? (
              <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
            ) : (
              <img src={previewUrl} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : (
            <>
              <div style={{ backgroundColor: '#fff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
                <ImageIcon size={30} color="#8e8e8e" />
              </div>
              <span style={{ fontSize: '1rem', color: '#262626', fontWeight: 'bold' }}>사진 또는 동영상 선택</span>
              <span style={{ fontSize: '0.85rem', color: '#8e8e8e', marginTop: '5px' }}>클릭하여 파일을 업로드하세요</span>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            style={{ display: 'none' }} 
          />
        </div>

        {/* 문구 입력 영역 */}
        <div style={{ width: '100%', maxWidth: '400px', marginTop: '20px' }}>
          <textarea 
            placeholder="스토리에 문구 추가..." 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              width: '100%', 
              height: '80px', 
              border: 'none', 
              borderBottom: '1px solid #efefef',
              padding: '10px 0',
              fontSize: '1rem',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        <p style={{ fontSize: '0.8rem', color: '#8e8e8e', marginTop: '20px', textAlign: 'center' }}>
          스토리는 24시간 동안 유지되며 팔로워들에게 공개됩니다.
        </p>
      </main>
    </div>
  );
};

export default StoryCreate;
