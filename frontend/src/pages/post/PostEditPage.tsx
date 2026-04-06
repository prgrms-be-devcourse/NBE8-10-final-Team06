import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft } from 'lucide-react';
import { postApi } from '../../api/post';
import { technologyApi } from '../../api/technology';
import { PostUpdateRequest } from '../../types/post';
import { TechTagRes } from '../../types/post';
import BottomNav from '../../components/layout/BottomNav';
import { resolveAssetUrl } from '../../util/assetUrl';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';

const PostEditPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [allTechs, setAllTechs] = useState<TechTagRes[]>([]);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [techSearchQuery, setTechSearchQuery] = useState('');
  /** 게시글에 붙어 있던 태그 메타(마스터 목록에 없을 때 이름 표시용) */
  const [postTechStacks, setPostTechStacks] = useState<TechTagRes[]>([]);

  const toggleTech = (techId: number) => {
    setSelectedTechIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const resolveTechMeta = (id: number): TechTagRes | undefined =>
    allTechs.find((t) => t.id === id) ?? postTechStacks.find((t) => t.id === id);

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

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        setLoading(true);
        let techRes: Awaited<ReturnType<typeof technologyApi.getTechnologies>> | null = null;
        try {
          techRes = await technologyApi.getTechnologies();
        } catch {
          setAllTechs([]);
        }
        if (techRes && isRsDataSuccess(techRes)) {
          setAllTechs(Array.isArray(techRes.data) ? techRes.data : []);
        } else if (techRes) {
          setAllTechs([]);
        }

        const postRes = await postApi.getDetail(Number(postId));

        if (isRsDataSuccess(postRes)) {
          setTitle(postRes.data.title);
          setContent(postRes.data.content);
          setPreviews(postRes.data.medias.map((m) => resolveAssetUrl(m.sourceUrl)));

          const stacks = Array.isArray(postRes.data.techStacks) ? postRes.data.techStacks : [];
          setPostTechStacks(stacks);
          setSelectedTechIds(stacks.map((t) => t.id));
        } else {
          alert(postRes.msg || '게시글을 불러올 수 없습니다.');
          navigate(-1);
        }
      } catch {
        alert('게시글을 불러올 수 없습니다.');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || submitting) return;

    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const req: PostUpdateRequest = {
        title: nextTitle,
        content: nextContent,
        techIds: selectedTechIds,
      };
      const res = await postApi.update(Number(postId), req, newFiles);
      if (isRsDataSuccess(res)) {
        alert('게시글이 수정되었습니다.');
        navigate(`/post/${postId}`, { replace: true });
        return;
      }
      alert(res.msg || '수정에 실패했습니다.');
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '수정에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>;

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
      <header style={{ height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', padding: '0 15px', position: 'sticky', top: 0, zIndex: 10 }}>
        <ChevronLeft size={28} onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', marginRight: '28px' }}>정보 수정</h2>
      </header>

      <main style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '8px', padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>사진 (수정 시 새로 업로드)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {previews.map((src, index) => (
                <div key={index} style={{ width: '80px', height: '80px', position: 'relative' }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} alt="preview" />
                </div>
              ))}
              <label style={{ width: '80px', height: '80px', border: '2px dashed #dbdbdb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <Camera size={24} color="#8e8e8e" />
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>제목</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: '4px', boxSizing: 'border-box' }} required />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>내용</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: '4px', boxSizing: 'border-box', resize: 'none' }} required />
          </div>

          <div style={{ marginBottom: '20px' }}>
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
              검색어가 없으면 전체 태그가 표시되고, 입력 시 이름·ID로 필터됩니다.
            </p>

            {selectedTechIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {selectedTechIds.map((id) => {
                  const tech = resolveTechMeta(id);
                  const label = tech?.name ?? `태그 #${id}`;
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

          <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', backgroundColor: '#0095f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? '수정 중...' : '수정 완료'}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
};

export default PostEditPage;
