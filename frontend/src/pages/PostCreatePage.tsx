import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import { postApi } from '../api/post';
import BottomNav from '../components/layout/BottomNav';

const PostCreatePage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsRequesting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      alert('최대 5개의 파일만 업로드 가능합니다.');
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert('최소 하나 이상의 이미지를 선택해주세요.');
      return;
    }

    try {
      setIsRequesting(true);
      const res = await postApi.create({
        title,
        content,
        techIds: [] // TODO: 기술 스택 API 연동 시 업데이트
      }, selectedFiles);

      if (res.resultCode.includes('-S-')) {
        alert('게시글이 생성되었습니다.');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      alert('게시글 생성에 실패했습니다.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
      <header style={{ height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>새 게시물 만들기</h2>
      </header>

      <main style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '8px', padding: '20px' }}>
          
          {/* 미디어 선택 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>사진/동영상 (최대 5개)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {previews.map((src, index) => (
                <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} alt="preview" />
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ed4956', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {selectedFiles.length < 5 && (
                <label style={{ width: '80px', height: '80px', border: '2px dashed #dbdbdb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e8e' }}>
                  <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  <Camera size={24} />
                </label>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>제목</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="제목을 입력하세요" 
              style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: '4px', boxSizing: 'border-box' }}
              required 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>내용</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="문구 입력..." 
              rows={6}
              style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: '4px', boxSizing: 'border-box', resize: 'none' }}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#0095f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? '공유 중...' : '공유하기'}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
};

export default PostCreatePage;
