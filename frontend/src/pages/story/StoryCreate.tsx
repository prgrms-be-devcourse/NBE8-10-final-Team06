import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyApi } from '../../api/story';
import { MediaType } from '../../types/story';

const StoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      // 확장자 기반 MediaType 추출
      const extension = file.name.split('.').pop()?.toLowerCase() as MediaType;
      
      const res = await storyApi.createStory({
        file,
        content,
        mediaType: extension,
        tagUserIds: []
      });

      if (res.resultCode.includes('-S-')) {
        alert('스토리가 생성되었습니다.');
        navigate('/');
      } else {
        alert(`생성 실패: ${res.msg}`);
      }
    } catch (error) {
      alert('스토리 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>스토리 만들기</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="file" onChange={handleFileChange} accept="image/*,video/*" required />
        <textarea 
          placeholder="문구 입력..." 
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          style={{ height: '100px', padding: '10px' }}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '업로드 중...' : '공유하기'}
        </button>
        <button type="button" onClick={() => navigate('/')}>취소</button>
      </form>
    </div>
  );
};

export default StoryCreate;
