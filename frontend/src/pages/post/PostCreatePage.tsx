import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import { postApi } from '../../api/post';
import { technologyApi } from '../../api/technology';
import { TechTagRes } from '../../types/post';
import BottomNav from '../../components/layout/BottomNav';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';

const PostCreatePage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [allTechs, setAllTechs] = useState<TechTagRes[]>([]);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techSearchQuery, setTechSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTechs = async () => {
      try {
        const res = await technologyApi.getTechnologies();
        if (isRsDataSuccess(res)) {
          setAllTechs(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        setAllTechs([]);
      }
    };
    fetchTechs();
  }, []);

  const toggleTech = (techId: number) => {
    setSelectedTechIds(prev => 
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
  };

  const displayedTechs = useMemo(() => {
    const raw = techSearchQuery.trim();
    if (!raw) return allTechs;
    const q = raw.toLowerCase();
    return allTechs.filter((tech) => {
      if (tech.name.toLowerCase().includes(q)) return true;
      if (/^\d+$/.test(raw) && String(tech.id).includes(raw)) return true;
      return false;
    });
  }, [allTechs, techSearchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const files = Array.from(e.target.files || []);
    
    // 용량 체크
    const oversizedFiles = files.filter(f => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      alert('10MB를 초과하는 파일은 업로드할 수 없습니다.');
      return;
    }

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

    try {
      setIsSubmitting(true);
      const res = await postApi.create({
        title,
        content,
        techIds: selectedTechIds
      }, selectedFiles);

      if (isRsDataSuccess(res)) {
        alert('게시글이 생성되었습니다.');
        navigate('/');
      }
    } catch (err: unknown) {
      console.error('게시글 생성 오류:', err);
      alert(getApiErrorMessage(err, '게시글 생성에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
      <header style={{ height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>새 게시물 만들기</h2>
      </header>

      <main style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '8px', padding: '20px' }}>
          
          {/* 미디어 선택 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              사진/동영상 <span style={{ fontWeight: 400, color: '#8e8e8e' }}>(선택 · 최대 5개)</span>
            </label>
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

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>기술 태그</label>
            <input
              type="search"
              value={techSearchQuery}
              onChange={(e) => setTechSearchQuery(e.target.value)}
              placeholder="태그 이름 검색 (예: React, Java)"
              autoComplete="off"
              style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '10px' }}
            />
            <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#8e8e8e' }}>
              검색어가 없으면 전체 태그가 표시됩니다. 입력 시 이름으로 필터되며, 숫자만 입력하면 ID로도 찾을 수 있습니다.
            </p>

            {selectedTechIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {selectedTechIds.map((id) => {
                  const tech = allTechs.find((t) => t.id === id);
                  const label = tech ? tech.name : `태그 #${id}`;
                  const color = tech?.color ?? '#dbdbdb';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedTechIds((prev) => prev.filter((v) => v !== id))}
                      style={{
                        padding: '4px 10px',
                        border: `1px solid ${color}`,
                        borderRadius: '14px',
                        background: tech ? `${color}18` : '#f7f7f7',
                        color: tech ? color : '#262626',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      #{label} ×
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '8px' }}>
              {displayedTechs.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: '#8e8e8e' }}>
                  {techSearchQuery.trim() ? '검색 결과가 없습니다.' : '등록된 기술 태그가 없습니다.'}
                </span>
              ) : (
                displayedTechs.map((tech) => {
                  const isSelected = selectedTechIds.includes(tech.id);
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
                        transition: 'all 0.2s',
                      }}
                    >
                      #{tech.name}
                    </button>
                  );
                })
              )}
            </div>
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
