import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { technologyApi } from '../../api/technology';
import { useAuthStore } from '../../store/useAuthStore';
import { TechTagRes } from '../../types/post';
import { TechCategoryInfoRes, TechCreateReq, TechUpdateReq } from '../../types/technology';
import BottomNav from '../../components/layout/BottomNav';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';
import { isTechAdminSession } from '../../util/techAdmin';
import { resolveAssetUrl } from '../../util/assetUrl';

const TechManagePage: React.FC = () => {
  const navigate = useNavigate();
  const myNickname = useAuthStore((s) => s.nickname);

  const [adminAllowed, setAdminAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [techs, setTechs] = useState<TechTagRes[]>([]);
  const [categories, setCategories] = useState<TechCategoryInfoRes[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('');
  const [createIconFile, setCreateIconFile] = useState<File | null>(null);
  const [createCategoryId, setCreateCategoryId] = useState<number | null>(null);
  const createIconInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIconUrl, setEditIconUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);

  const canSaveEdit = () => {
    return (
      editingId != null &&
      editName.trim().length > 0 &&
      editColor.trim().length > 0 &&
      editIconUrl.trim().length > 0 &&
      editCategoryId != null
    );
  };

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [techOutcome, catOutcome] = await Promise.allSettled([
        technologyApi.getTechnologies(),
        technologyApi.getTechCategories(),
      ]);
      if (techOutcome.status === 'fulfilled' && isRsDataSuccess(techOutcome.value)) {
        setTechs(Array.isArray(techOutcome.value.data) ? techOutcome.value.data : []);
      } else {
        setTechs([]);
        if (techOutcome.status === 'rejected') {
          setErrorMsg(getApiErrorMessage(techOutcome.reason, '기술 목록 로드 실패'));
        }
      }
      if (catOutcome.status === 'fulfilled' && isRsDataSuccess(catOutcome.value)) {
        setCategories(Array.isArray(catOutcome.value.data) ? catOutcome.value.data : []);
      } else {
        setCategories([]);
        if (catOutcome.status === 'rejected') {
          setErrorMsg((prev) => prev ?? getApiErrorMessage(catOutcome.reason, '카테고리 로드 실패'));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      const ok = await isTechAdminSession(myNickname);
      setAdminAllowed(ok);
      if (ok) {
        await refresh();
      } else {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && createCategoryId == null) {
      setCreateCategoryId(categories[0].id);
    }
  }, [categories, createCategoryId]);

  const handleCreate = async () => {
    if (!createCategoryId) {
      alert('카테고리를 선택해 주세요.');
      return;
    }
    const req: TechCreateReq = {
      categoryId: createCategoryId,
      name: createName.trim(),
      color: createColor.trim(),
    };
    if (!req.name || !req.color) {
      alert('이름/색상을 입력해 주세요.');
      return;
    }
    try {
      const res = await technologyApi.createTech(req, createIconFile);
      if (isRsDataSuccess(res)) {
        alert('기술이 생성되었습니다.');
        setCreateName('');
        setCreateColor('');
        setCreateIconFile(null);
        if (createIconInputRef.current) {
          createIconInputRef.current.value = '';
        }
        setEditingId(null);
        await refresh();
      } else {
        alert(res.msg || '생성에 실패했습니다.');
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '생성 중 오류'));
    }
  };

  const startEdit = (tech: TechTagRes) => {
    setEditingId(tech.id);
    setEditName(tech.name);
    setEditColor(tech.color);
    setEditIconUrl((tech.iconUrl ?? '').trim());
    setEditCategoryId(categories[0]?.id ?? null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setEditIconUrl('');
    setEditCategoryId(null);
  };

  const handleSaveEdit = async () => {
    if (!canSaveEdit() || editingId == null) return;

    const req: TechUpdateReq = {
      categoryId: editCategoryId as number,
      name: editName.trim(),
      color: editColor.trim(),
      iconUrl: editIconUrl.trim(),
    };

    try {
      const res = await technologyApi.updateTech(editingId, req);
      if (isRsDataSuccess(res)) {
        alert('기술이 수정되었습니다.');
        cancelEdit();
        await refresh();
      } else {
        alert(res.msg || '수정에 실패했습니다.');
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '수정 중 오류'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await technologyApi.deleteTech(id);
      if (isRsDataSuccess(res)) {
        alert('삭제되었습니다.');
        if (editingId === id) cancelEdit();
        await refresh();
      } else {
        alert(res.msg || '삭제에 실패했습니다.');
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '삭제 중 오류'));
    }
  };

  if (adminAllowed === null) {
    return (
      <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
        <header
          style={{
            height: '60px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #dbdbdb',
            display: 'flex',
            alignItems: 'center',
            padding: '0 15px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 700 }}>기술 관리</span>
          <span style={{ width: 80 }} />
        </header>
        <main style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 8, padding: 20, textAlign: 'center' }}>
            확인 중...
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (adminAllowed === false) {
    return (
      <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
        <header
          style={{
            height: '60px',
            backgroundColor: '#fff',
            borderBottom: '1px solid #dbdbdb',
            display: 'flex',
            alignItems: 'center',
            padding: '0 15px',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ padding: '6px 12px', border: '1px solid #dbdbdb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
          >
            돌아가기
          </button>
          <span style={{ fontWeight: 700 }}>기술 관리</span>
          <span style={{ width: 80 }} />
        </header>
        <main style={{ maxWidth: '600px', margin: '20px auto', padding: '0 15px' }}>
          <div style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 8, padding: 20 }}>
            접근 권한이 없습니다.
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '80px' }}>
      <header
        style={{
          height: '60px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #dbdbdb',
          display: 'flex',
          alignItems: 'center',
          padding: '0 15px',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ padding: '6px 12px', border: '1px solid #dbdbdb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          돌아가기
        </button>
        <span style={{ fontWeight: 700 }}>기술 관리</span>
        <button
          type="button"
          onClick={() => navigate('/technologies/categories/manage')}
          style={{ padding: '6px 12px', border: '1px solid #dbdbdb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          카테고리 관리
        </button>
      </header>

      <main style={{ maxWidth: '720px', margin: '20px auto', padding: '0 15px' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}>로딩 중...</div>
        ) : (
          <>
            {errorMsg && (
              <div style={{ marginBottom: 16, background: '#fff', border: '1px solid #ed4956', color: '#ed4956', borderRadius: 8, padding: 12 }}>
                {errorMsg}
              </div>
            )}

            <section style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>기술 생성</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                  이름
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6 }}
                  />
                </label>
                <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                  색상(예: #0095f6)
                  <input
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6 }}
                  />
                </label>
                <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                  카테고리
                  <select
                    value={createCategoryId ?? ''}
                    onChange={(e) => setCreateCategoryId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6, background: '#fafafa' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                  아이콘 이미지(선택)
                  <input
                    ref={createIconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCreateIconFile(e.target.files?.[0] ?? null)}
                    style={{ width: '100%', padding: '8px 0', marginTop: 6, fontSize: 13 }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handleCreate}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                  disabled={categories.length === 0}
                >
                  <Plus size={16} />
                  생성
                </button>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>기술 목록</h3>

              {techs.length === 0 ? (
                <div style={{ color: '#8e8e8e', fontWeight: 600 }}>기술이 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {techs.map((tech) => {
                    const isEditing = editingId === tech.id;
                    return (
                      <div
                        key={tech.id}
                        style={{
                          border: '1px solid #efefef',
                          borderRadius: 10,
                          padding: 14,
                          background: '#fafafa',
                        }}
                      >
                        {!isEditing ? (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {tech.iconUrl ? (
                                <img
                                  src={resolveAssetUrl(tech.iconUrl)}
                                  alt=""
                                  width={28}
                                  height={28}
                                  style={{ borderRadius: 6, objectFit: 'cover', border: `1px solid ${tech.color}40` }}
                                />
                              ) : (
                                <span style={{ width: 28, height: 28, borderRadius: 6, background: tech.color, display: 'inline-block' }} />
                              )}
                              <div>
                                <div style={{ fontWeight: 800 }}>{tech.name}</div>
                                <div style={{ fontSize: 12, color: '#8e8e8e' }}>#{tech.id}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => startEdit(tech)}
                                style={{ padding: '8px 12px', background: '#fff', border: '1px solid #dbdbdb', borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                <Pencil size={16} />
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(tech.id)}
                                style={{ padding: '8px 12px', background: '#fff', border: '1px solid #dbdbdb', borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#ed4956' }}
                              >
                                <Trash2 size={16} />
                                삭제
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                              이름
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6, background: '#fff' }}
                              />
                            </label>
                            <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                              색상
                              <input
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6, background: '#fff' }}
                              />
                            </label>
                            <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                              카테고리(필수)
                              <select
                                value={editCategoryId ?? ''}
                                onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : null)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6, background: '#fff' }}
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label style={{ display: 'block', fontSize: 12, color: '#8e8e8e' }}>
                              iconUrl(수정 API용, 필수)
                              <input
                                value={editIconUrl}
                                onChange={(e) => setEditIconUrl(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6, background: '#fff' }}
                                placeholder="스토리지에 저장된 아이콘 URL"
                              />
                            </label>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                style={{ padding: '10px 14px', background: '#fff', border: '1px solid #dbdbdb', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit()}
                                disabled={!canSaveEdit()}
                                style={{
                                  padding: '10px 14px',
                                  background: '#0095f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: canSaveEdit() ? 'pointer' : 'not-allowed',
                                  fontWeight: 800,
                                  opacity: canSaveEdit() ? 1 : 0.7,
                                }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default TechManagePage;

