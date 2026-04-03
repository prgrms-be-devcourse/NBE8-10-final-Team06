// src/pages/story/ArchivedStoryViewer.tsx
/** 보관(만료)·소프트삭제된 스토리 전용 풀스크린 뷰 — 활성 스토리 API(recordView/like) 미사용 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2, X } from 'lucide-react';
import { storyApi } from '../../api/story';
import { StoryDetailResponse } from '../../types/story';
import { getAlternateAssetUrl, resolveAssetUrl } from '../../util/assetUrl';
import { getApiErrorMessage } from '../../util/apiError';
import { isRemoteStoryMediaUrl } from '../../util/storyMediaUrl';
import { isRsDataSuccess } from '../../util/rsData';
import { useAuthStore } from '../../store/useAuthStore';
import ProfileAvatar from '../../components/common/ProfileAvatar';

const STORY_DURATION_MS = 8000;

function isImageMedia(mediaType: string) {
  const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  return ext.includes(mediaType.toLowerCase());
}

const ArchivedStoryViewer: React.FC = () => {
  const { storyId: storyIdStr } = useParams<{ storyId: string }>();
  const storyId = Number(storyIdStr);
  const navigate = useNavigate();
  const myNickname = useAuthStore((s) => s.nickname);

  const [list, setList] = useState<StoryDetailResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const listRef = useRef<StoryDetailResponse[]>([]);
  const indexRef = useRef(0);
  listRef.current = list;
  indexRef.current = index;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(storyId) || storyId <= 0) {
        navigate('/story/archive', { replace: true });
        return;
      }
      setLoading(true);
      try {
        const res = await storyApi.getArchive();
        if (cancelled) return;
        if (!isRsDataSuccess(res) || !Array.isArray(res.data)) {
          navigate('/story/archive', { replace: true });
          return;
        }
        const ordered = [...res.data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const i = ordered.findIndex((s) => s.storyId === storyId);
        if (i < 0) {
          navigate('/story/archive', { replace: true });
          return;
        }
        setList(ordered);
        setIndex(i);
        setProgress(0);
      } catch {
        if (!cancelled) navigate('/story/archive', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, navigate]);

  const current = list[index];
  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/story/archive');
  }, [navigate]);

  const goToIndex = useCallback(
    (nextIdx: number) => {
      const L = listRef.current;
      if (nextIdx < 0 || nextIdx >= L.length) return;
      const s = L[nextIdx];
      setIndex(nextIdx);
      setProgress(0);
      navigate(`/story/archive/${s.storyId}`, { replace: true });
    },
    [navigate]
  );

  const handleNext = useCallback(() => {
    const i = indexRef.current;
    if (i < listRef.current.length - 1) goToIndex(i + 1);
  }, [goToIndex]);

  const handlePrev = useCallback(() => {
    const i = indexRef.current;
    if (i > 0) goToIndex(i - 1);
  }, [goToIndex]);

  useEffect(() => {
    if (!current || loading) return;
    setProgress(0);
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / STORY_DURATION_MS) * 100);
      setProgress(p);
      if (p < 100) return;
      window.clearInterval(id);
      const L = listRef.current;
      setIndex((i) => {
        if (i >= L.length - 1) return i;
        const ni = i + 1;
        const ns = L[ni];
        if (ns) queueMicrotask(() => navigate(`/story/archive/${ns.storyId}`, { replace: true }));
        return ni;
      });
      setProgress(0);
    }, 50);
    return () => window.clearInterval(id);
  }, [current?.storyId, loading, navigate]);

  const handleHardDelete = async () => {
    if (!current) return;
    if (isRemoteStoryMediaUrl(current.mediaUrl)) {
      alert(
        '이 스토리는 외부 주소(https://…) 미디어입니다. 서버 로컬 파일 삭제 단계에서 오류가 나므로, 완전 삭제를 쓰려면 백엔드에서 외부 URL일 때 파일 삭제를 건너뛰도록 수정해야 합니다.'
      );
      return;
    }
    if (!window.confirm('이 스토리를 완전히 삭제하시겠습니까?')) return;
    try {
      const res = await storyApi.hardDelete(current.storyId);
      if (isRsDataSuccess(res) || res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const nextList = listRef.current.filter((s) => s.storyId !== current.storyId);
        if (nextList.length === 0) {
          navigate('/story/archive', { replace: true });
          return;
        }
        setList(nextList);
        const nextIdx = Math.min(index, nextList.length - 1);
        setIndex(nextIdx);
        setProgress(0);
        navigate(`/story/archive/${nextList[nextIdx].storyId}`, { replace: true });
      } else {
        alert(res.msg || '삭제에 실패했습니다.');
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '스토리 삭제에 실패했습니다.'));
    }
  };

  if (loading || !current) {
    return (
      <div
        style={{
          backgroundColor: '#000',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        로딩 중…
      </div>
    );
  }

  const label = myNickname?.trim() || '내 스토리';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1a1a1a',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 15,
          width: '95%',
          maxWidth: 400,
          display: 'flex',
          gap: 4,
          zIndex: 2100,
        }}
      >
        {list.map((s, idx) => (
          <div
            key={s.storyId}
            style={{
              height: 2,
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: idx < index ? '100%' : idx === index ? `${progress}%` : '0%',
                backgroundColor: '#fff',
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 30,
          width: '95%',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          zIndex: 2100,
          padding: '0 10px',
        }}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label="뒤로"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: 8 }}
        >
          <ChevronLeft size={28} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#efefef',
              marginRight: 10,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <ProfileAvatar
              fillContainer
              authorUserId={current.userId}
              profileImageUrl={null}
              nickname={label}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>보관된 스토리</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleHardDelete}
          title="완전 삭제"
          aria-label="완전 삭제"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <Trash2 size={18} />
        </button>
        <button
          type="button"
          onClick={goBack}
          aria-label="닫기"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={28} />
        </button>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 450,
          height: '85vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {isImageMedia(current.mediaType) ? (
          <img
            src={getFullUrl(current.mediaUrl)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === '1') return;
              const fb = getFallbackUrl(current.mediaUrl);
              if (fb) {
                img.dataset.fallbackApplied = '1';
                img.src = fb;
              }
            }}
          />
        ) : (
          <video
            src={getFullUrl(current.mediaUrl)}
            autoPlay
            muted
            playsInline
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              const v = e.currentTarget;
              if (v.dataset.fallbackApplied === '1') return;
              const fb = getFallbackUrl(current.mediaUrl);
              if (fb) {
                v.dataset.fallbackApplied = '1';
                v.src = fb;
                v.load();
              }
            }}
          />
        )}
        <button
          type="button"
          aria-label="이전 스토리"
          onClick={handlePrev}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '30%',
            height: '100%',
            border: 'none',
            padding: 0,
            background: 'transparent',
            cursor: index > 0 ? 'pointer' : 'default',
          }}
        />
        <button
          type="button"
          aria-label="다음 스토리"
          onClick={handleNext}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '70%',
            height: '100%',
            border: 'none',
            padding: 0,
            background: 'transparent',
            cursor: index < list.length - 1 ? 'pointer' : 'default',
          }}
        />
      </div>

      {current.content ? (
        <p
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '90%',
            color: '#fff',
            fontSize: '0.85rem',
            textAlign: 'center',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            margin: 0,
          }}
        >
          {current.content}
        </p>
      ) : null}
    </div>
  );
};

export default ArchivedStoryViewer;
