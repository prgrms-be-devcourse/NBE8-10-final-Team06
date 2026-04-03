import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { technologyApi } from '../../api/technology';
import { useAuthStore } from '../../store/useAuthStore';
import { TechCategoryInfoRes, TechCategoryCreateReq, TechCategoryUpdateReq } from '../../types/technology';
import BottomNav from '../../components/layout/BottomNav';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';
import { isTechAdminSession } from '../../util/techAdmin';

const TechCategoryManagePage: React.FC = () => {
  const navigate = useNavigate();
  const myNickname = useAuthStore((s) => s.nickname);

  const [adminAllowed, setAdminAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TechCategoryInfoRes[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const catRes = await technologyApi.getTechCategories();
      if (isRsDataSuccess(catRes)) {
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      } else {
        setCategories([]);
      }
    } catch (err: unknown) {
      setCategories([]);
      setErrorMsg(getApiErrorMessage(err, '카테고리 로드 실패'));
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

  const handleCreate = async () => {
    const req: TechCategoryCreateReq = { name: createName.trim(), color: createColor.trim() };
    if (!req.name || !req.color) {
      alert('이름과 색상을 입력해 주세요.');
      return;
    }
    try {
      const res = await technologyApi.createTechCategory(req);
      if (isRsDataSuccess(res)) {
        alert('카테고리가 생성되었습니다.');
        setCreateName('');
        setCreateColor('');
        await refresh();
      } else {
        alert(res.msg || '생성에 실패했습니다.');
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '생성 중 오류'));
    }
  };

  const startEdit = (c: TechCategoryInfoRes) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const req: TechCategoryUpdateReq = { name: editName.trim(), color: editColor.trim() };
    if (!req.name || !req.color) {
      alert('이름과 색상을 입력해 주세요.');
      return;
    }
    try {
      const res = await technologyApi.updateTechCategory(editingId, req);
      if (isRsDataSuccess(res)) {
        alert('카테고리가 수정되었습니다.');
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
      const res = await technologyApi.deleteTechCategory(id);
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
          <span style={{ fontWeight: 700 }}>카테고리 관리</span>
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
          <span style={{ fontWeight: 700 }}>카테고리 관리</span>
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
        <span style={{ fontWeight: 700 }}>기술 카테고리 관리</span>
        <button
          type="button"
          onClick={() => navigate('/technologies/manage')}
          style={{ padding: '6px 12px', border: '1px solid #dbdbdb', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
        >
          기술 관리
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>카테고리 생성</h3>
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
                  색상(예: #ff0000)
                  <input
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dbdbdb', borderRadius: 6, marginTop: 6 }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handleCreate}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  생성
                </button>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>카테고리 목록</h3>

              {categories.length === 0 ? (
                <div style={{ color: '#8e8e8e', fontWeight: 600 }}>카테고리가 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categories.map((c) => {
                    const isEditing = editingId === c.id;
                    return (
                      <div
                        key={c.id}
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
                              <span style={{ width: 14, height: 14, borderRadius: 4, background: c.color, display: 'inline-block' }} />
                              <div>
                                <div style={{ fontWeight: 800 }}>{c.name}</div>
                                <div style={{ fontSize: 12, color: '#8e8e8e' }}>#{c.id}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                style={{ padding: '8px 12px', background: '#fff', border: '1px solid #dbdbdb', borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                <Pencil size={16} />
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(c.id)}
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
                                style={{ padding: '10px 14px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 800 }}
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

export default TechCategoryManagePage;

