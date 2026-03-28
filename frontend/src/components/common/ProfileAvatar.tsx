import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileImageCacheStore } from '../../store/useProfileImageCacheStore';
import { applyImageFallback, resolveProfileImageUrl } from '../../util/assetUrl';

export type ProfileAvatarProps = {
  profileImageUrl?: string | null;
  /** 로그인 유저 본인이면 세션에 맞춘 프로필 이미지 URL을 우선 사용(포스트·스토리바·프로필 통일) */
  authorUserId?: number | null;
  nickname?: string | null;
  /** 고정 크기(픽셀). `fillContainer`와 함께 쓰지 않습니다. */
  sizePx?: number;
  /** 부모가 원형 영역을 잡은 경우 꽉 채웁니다. */
  fillContainer?: boolean;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
};

/**
 * 스토리/포스트/프로필 등에서 동일한 방식으로 프로필 이미지를 표시합니다.
 * userId가 있으면 세션(본인)·클라이언트 캐시로 화면 간 URL을 맞춥니다.
 * URL 해석·로드 실패 시 alternate 경로 및 기본 이미지는 `assetUrl`에서 처리합니다.
 */
const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profileImageUrl,
  authorUserId,
  nickname,
  sizePx,
  fillContainer = false,
  style,
  className,
  alt,
}) => {
  const myUserId = useAuthStore((s) => s.userId);
  const sessionProfileImageUrl = useAuthStore((s) => s.profileImageUrl);

  const uid =
    authorUserId != null && Number.isFinite(Number(authorUserId)) ? Number(authorUserId) : null;

  const cachedUrl = useProfileImageCacheStore((s) =>
    uid != null ? s.entries[uid]?.url : undefined
  );

  useEffect(() => {
    if (uid == null) return;
    const hint = profileImageUrl?.trim();
    if (hint) {
      useProfileImageCacheStore.getState().seedProfileImageHint(uid, hint);
    }
  }, [uid, profileImageUrl]);

  const isSelf =
    authorUserId != null &&
    myUserId != null &&
    Number(authorUserId) === Number(myUserId);

  const rawUrl = isSelf
    ? (sessionProfileImageUrl ?? cachedUrl ?? profileImageUrl)
    : (cachedUrl ?? profileImageUrl);
  const src = resolveProfileImageUrl(rawUrl);

  const base: React.CSSProperties = fillContainer
    ? {
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'block',
        objectFit: 'cover',
        borderRadius: '50%',
      }
    : {
        width: sizePx ?? 32,
        height: sizePx ?? 32,
        objectFit: 'cover',
        borderRadius: '50%',
        flexShrink: 0,
      };

  return (
    <img
      className={className}
      src={src}
      alt={alt ?? (nickname ? `${nickname} 프로필` : '프로필')}
      style={{ ...base, ...style }}
      onError={(e) => applyImageFallback(e, rawUrl)}
    />
  );
};

export default ProfileAvatar;
