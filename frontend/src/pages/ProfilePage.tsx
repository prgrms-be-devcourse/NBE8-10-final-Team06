import React, { useEffect, useState, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useFollowSyncStore } from '../store/useFollowSyncStore';
import { mergeFollowingHint, useFollowLocalStore } from '../store/useFollowLocalStore';
import { userApi, FOLLOW_CHANGED_EVENT } from '../api/user';
import { performClientLogout } from '../services/performClientLogout';
import { applyAuthoritativeFollowStatus } from '../services/profileFollowState';
import { loadFollowListsAndCounts } from '../services/profileFollowStats';
import { toggleFollowRelation } from '../services/followToggle';
import { postApi } from '../api/post';
import { storyApi } from '../api/story';
import { dmApi } from '../api/dm';
import { UserProfileResponse, Resume, FollowUserResponse, FollowResponse } from '../types/user';
import { PostFeedProfileRes } from '../types/post';
import { StoryDetailResponse } from '../types/story';
import { Grid, Heart, Bookmark, BarChart2, AlertCircle, MessageCircle, LogOut, Clock3, Trash2 } from 'lucide-react';
import UserListModal from '../components/profile/UserListModal';
import MainLayout from '../components/layout/MainLayout';
import { getAlternateAssetUrl, resolveAssetUrl } from '../util/assetUrl';
import { getApiErrorMessage } from '../util/apiError';
import ProfileAvatar from '../components/common/ProfileAvatar';
import TechRadarChart from '../components/profile/TechRadarChart';
import { useProfileImageCacheStore } from '../store/useProfileImageCacheStore';
import { getProfilePostCountLabel } from '../util/profilePostCount';

const RESUME_MAP: Record<Resume, string> = {
  [Resume.UNSPECIFIED]: "미지정",
  [Resume.UNDERGRADUATE]: "학부생",
  [Resume.JUNIOR]: "주니어 개발자",
  [Resume.INTERMEDIATE]: "미들급 개발자",
  [Resume.SENIOR]: "시니어 개발자",
};

const BLACKLIST = new Set<string>();

const ProfilePage: React.FC = () => {
  const { nickname: urlNickname } = useParams<{ nickname: string }>();
  const { nickname: myNickname, isLoggedIn, userId: myUserId, setSessionProfileImageUrl } = useAuthStore();

  /** 프로필 주인의 활성 스토리 유무 + 스토리 피드 기준 미열람(무지개 링). 피드에 없으면 활성만 있어도 무지개로 유도 */
  const [profileStoryRing, setProfileStoryRing] = useState<{
    loaded: boolean;
    hasActiveStories: boolean;
    /** 피드 행이 있으면 그 isUnread, 없으면 null → 무지개 링 유지 */
    feedUnread: boolean | null;
  }>({ loaded: false, hasActiveStories: false, feedUnread: null });
  const profileStoryRingGen = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'scraps' | 'tech' | 'archive'>('posts');
  const [scrappedPosts, setScrappedPosts] = useState<PostFeedProfileRes[]>([]);
  const [scrapsLast, setScrapsLast] = useState(true);
  const [scrapsPage, setScrapsPage] = useState(0);
  const [scrapsLoadingMore, setScrapsLoadingMore] = useState(false);
  const [scrapsTotalElements, setScrapsTotalElements] = useState<number | null>(null);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [archivedStories, setArchivedStories] = useState<StoryDetailResponse[]>([]);
  const [followers, setFollowers] = useState<FollowUserResponse[]>([]);
  const [followings, setFollowings] = useState<FollowUserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFollowProcessing, setIsFollowProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [modalConfig, setModalConfig] = useState<{ title: string; id: number; type: 'followers' | 'followings' } | null>(null);

  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);

  const isVideo = (mediaType: string) =>
    ['mp4', 'webm', 'mov'].includes(mediaType.toLowerCase());

  const targetNickname = urlNickname || myNickname;
  const isMe = myNickname === targetNickname;

  /** 라우트 전환 직후 옛 profile 객체가 남아 있을 수 있어 userId까지 대조 */
  useEffect(() => {
    if (!isMe || !profile || myUserId == null || Number(profile.userId) !== Number(myUserId)) return;
    setSessionProfileImageUrl(profile.profileImageUrl ?? null);
  }, [isMe, profile, myUserId, setSessionProfileImageUrl]);

  /** 빠른 라우트 전환 시 이전 getProfile 응답이 늦게 와도 상태를 덮어쓰지 않게 함 */
  const profileLoadGen = useRef(0);
  /** resyncProfileQuiet 전용 — profileLoadGen 과 분리 (메인 fetchProfile 의 loading finally 와 충돌 방지) */
  const quietResyncGen = useRef(0);
  /** 팔로워/팔로잉 목록 요청 — 늦게 도착한 이전 프로필·이전 타이밍 응답이 목록만 덮어쓰지 않게 함 */
  const followListGen = useRef(0);
  const profileRef = useRef<UserProfileResponse | null>(null);
  /** setState 보다 먼저 들어오는 연타 클릭 차단 (언팔 직후 재요청 레이스 방지) */
  const followToggleLockRef = useRef(false);
  /**
   * toggleFollowRelation 이 status 병합 후 쏘는 follow:changed 와 handleFollowToggle 의 setProfile 이 겹치면
   * 헤더 isFollowing 이 잠깐 맞았다가 다시 뒤집히는 현상이 날 수 있어, 이 페이지에서 버튼으로 토글한
   * 대상에 한해 한 틱 동안 리스너의 상대 헤더 갱신을 건너뜀 (모달·검색 등 다른 출처 이벤트는 그대로 반영).
   */
  const suppressFollowEventForTargetIdRef = useRef<number | null>(null);
  /** 이전 렌더가 '내 닉네임 프로필'이었는지 — 타 유저 → 내 프로필 전환 시 팔로우 변경분 반영 */
  const prevViewingSelfRef = useRef(false);
  /** 라우트 기준 닉네임 — 전환 직후 profileRef 는 아직 이전 유저를 가리킬 수 있어 비동기 완료 시 이것과만 대조 */
  const targetNicknameRef = useRef<string | undefined>(undefined);
  profileRef.current = profile;
  targetNicknameRef.current = targetNickname ?? undefined;
  const followSyncEpoch = useFollowSyncStore((s) => s.epoch);

  const viewedOthersUserId =
    profile != null && !isMe ? Number(profile.userId) : NaN;
  const followHintForViewedProfile = useFollowLocalStore((s) =>
    Number.isFinite(viewedOthersUserId) ? s.followingHintByUserId[viewedOthersUserId] : undefined
  );
  /** 다른 화면에서 토글한 뒤 돌아와도 헤더가 힌트와 맞게 보이도록 */
  const displayIsFollowingOthersProfile =
    profile != null && !isMe
      ? followHintForViewedProfile !== undefined
        ? followHintForViewedProfile
        : profile.isFollowing
      : false;

  /**
   * 팔로워/팔로잉 목록 + 헤더 카운트를 서버와 맞춤.
   * - forceApplyFollowLists: setProfile 직후 호출 시 true — 아직 커밋 전이라 profileRef 가 옛 유저를 가리켜도 목록을 반드시 반영
   * - false(기본): 지금 화면의 프로필 userId 와 uid 가 같을 때만 followers/followings 상태 갱신(오염 방지)
   */
  const fetchFollowLists = useCallback(
    async (
      targetUserId: number,
      opts?: { forceApplyFollowLists?: boolean; viewerFollowsOwner?: boolean }
    ) => {
      const uid = Number(targetUserId);
      if (!Number.isFinite(uid)) return;
      const forceLists = opts?.forceApplyFollowLists === true;
      const gen = ++followListGen.current;
      try {
        let viewerFollowsOwner = opts?.viewerFollowsOwner;
        if (viewerFollowsOwner === undefined) {
          const pr = profileRef.current;
          if (
            pr != null &&
            Number(pr.userId) === uid &&
            myUserId != null &&
            Number(pr.userId) !== Number(myUserId)
          ) {
            viewerFollowsOwner = mergeFollowingHint(uid, pr.isFollowing);
          } else {
            viewerFollowsOwner = true;
          }
        }
        const pack = await loadFollowListsAndCounts(uid, {
          viewerUserId: myUserId,
          viewerFollowsOwner,
        });
        if (gen !== followListGen.current) return;
        if (!pack) return;
        const viewedRaw = profileRef.current?.userId;
        const viewed =
          viewedRaw != null && Number.isFinite(Number(viewedRaw)) ? Number(viewedRaw) : NaN;
        const mayApplyLists = forceLists || (!Number.isNaN(viewed) && viewed === uid);
        if (mayApplyLists) {
          setFollowers(
            pack.followers.map((f) => ({
              ...f,
              isFollowing: mergeFollowingHint(f.userId, f.isFollowing),
            }))
          );
          setFollowings(
            pack.followings.map((f) => ({
              ...f,
              isFollowing: mergeFollowingHint(f.userId, f.isFollowing),
            }))
          );
        }
        setProfile((prev) => {
          if (!prev || Number(prev.userId) !== uid) return prev;
          const next = { ...prev };
          if (pack.followerCount != null) next.followerCount = pack.followerCount;
          if (pack.followingCount != null) next.followingCount = pack.followingCount;
          return next;
        });
      } catch (err) {
        console.error('팔로우 목록 동기화 실패:', err);
      }
    },
    [myUserId]
  );

  const resyncProfileQuiet = useCallback(
    async (name: string) => {
      if (!name || BLACKLIST.has(name)) return;
      const requestedName = name;
      const gen = ++quietResyncGen.current;
      try {
        const res = await userApi.getProfile(name);
        if (gen !== quietResyncGen.current) return;
        if (targetNicknameRef.current !== requestedName) return;
        if (!(res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) || !res.data) return;
        const normalized = await applyAuthoritativeFollowStatus(res.data, () => gen !== quietResyncGen.current);
        if (gen !== quietResyncGen.current) return;
        if (targetNicknameRef.current !== requestedName) return;
        setProfile(normalized);
        useProfileImageCacheStore.getState().setAuthoritativeProfileImage(
          normalized.userId,
          normalized.profileImageUrl ?? null
        );
        await fetchFollowLists(normalized.userId, { forceApplyFollowLists: true });
      } catch {
        /* */
      }
    },
    [fetchFollowLists]
  );

  const fetchProfile = useCallback(async (name: string, force: boolean = false) => {
    if (!force && BLACKLIST.has(name)) return;
    const gen = ++profileLoadGen.current;
    try {
      setLoading(true);
      setError(null);
      const res = await userApi.getProfile(name);
      if (gen !== profileLoadGen.current) return;
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        if (!res.data) {
          setProfile(null);
          setError('프로필 데이터가 비어 있습니다.');
          return;
        }
        const normalized = await applyAuthoritativeFollowStatus(res.data, () => gen !== profileLoadGen.current);
        if (gen !== profileLoadGen.current) return;
        setProfile(normalized);
        useProfileImageCacheStore.getState().setAuthoritativeProfileImage(
          normalized.userId,
          normalized.profileImageUrl ?? null
        );
        BLACKLIST.delete(name);
        await fetchFollowLists(normalized.userId, { forceApplyFollowLists: true });
      } else {
        setProfile(null);
        setFollowers([]);
        setFollowings([]);
        const code = res.resultCode || '';
        const isNotFound = /404/i.test(code);
        setError(isNotFound ? res.msg || '존재하지 않는 사용자입니다.' : res.msg || '프로필 정보를 불러오지 못했습니다.');
      }
    } catch (err: unknown) {
      if (gen !== profileLoadGen.current) return;
      setProfile(null);
      setFollowers([]);
      setFollowings([]);
      if (isAxiosError(err) && err.response?.status === 500) {
        BLACKLIST.add(name);
        setError('백엔드 결함으로 정보를 표시할 수 없습니다.');
      } else if (isAxiosError(err) && err.response?.status === 404) {
        setError(getApiErrorMessage(err, '존재하지 않는 사용자입니다.'));
      } else {
        setError(getApiErrorMessage(err, '프로필 정보를 불러오지 못했습니다.'));
      }
    } finally {
      if (gen === profileLoadGen.current) {
        setLoading(false);
      }
    }
  }, [fetchFollowLists]);

  const mapScrapToGrid = useCallback(
    (p: { id: number; medias: PostFeedProfileRes['medias']; techStacks: PostFeedProfileRes['techStacks']; likeCount: number; commentCount: number }) => ({
      id: p.id,
      medias: p.medias,
      techStacks: p.techStacks,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
    }),
    []
  );

  const fetchScrapsInitial = useCallback(async () => {
    if (!isMe) return;
    try {
      const res = await postApi.getScraps(0);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const data = res.data;
        const mapped = (data.content ?? []).map((p) => mapScrapToGrid(p));
        setScrappedPosts(mapped);
        setScrapsLast(data.last);
        setScrapsPage(0);
        setScrapsTotalElements(typeof data.totalElements === 'number' ? data.totalElements : null);
      }
    } catch (err) {
      console.error('스크랩 로드 실패', err);
    }
  }, [isMe, mapScrapToGrid]);

  const loadMoreProfilePosts = useCallback(async () => {
    const name = targetNicknameRef.current;
    if (!name || postsLoadingMore || !profileRef.current?.posts || profileRef.current.posts.last) return;
    setPostsLoadingMore(true);
    try {
      const nextPage = profileRef.current.posts.number + 1;
      const res = await userApi.getProfile(name, nextPage);
      if (!(res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) || !res.data) return;
      if (targetNicknameRef.current !== name) return;
      const data = res.data;
      setProfile((prev) => {
        if (!prev || prev.userId !== data.userId) return data;
        const inc = data.posts;
        return {
          ...data,
          posts: {
            ...inc,
            content: [...prev.posts.content, ...inc.content],
            first: prev.posts.first,
            numberOfElements: prev.posts.content.length + inc.content.length,
          },
        };
      });
    } catch (err) {
      console.error('게시물 추가 로드 실패', err);
    } finally {
      setPostsLoadingMore(false);
    }
  }, [postsLoadingMore]);

  const loadMoreScraps = useCallback(async () => {
    if (!isMe || scrapsLast || scrapsLoadingMore) return;
    setScrapsLoadingMore(true);
    try {
      const nextPage = scrapsPage + 1;
      const res = await postApi.getScraps(nextPage);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const data = res.data;
        const mapped = (data.content ?? []).map((p) => mapScrapToGrid(p));
        setScrappedPosts((prev) => [...prev, ...mapped]);
        setScrapsLast(data.last);
        setScrapsPage(nextPage);
        if (typeof data.totalElements === 'number') setScrapsTotalElements(data.totalElements);
      }
    } catch (err) {
      console.error('스크랩 추가 로드 실패', err);
    } finally {
      setScrapsLoadingMore(false);
    }
  }, [isMe, scrapsLast, scrapsLoadingMore, scrapsPage, mapScrapToGrid]);

  const fetchArchivedStories = useCallback(async () => {
    if (!isMe) return;
    try {
      const res = await storyApi.getArchive();
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        setArchivedStories(res.data || []);
      }
    } catch (err) {
      console.error('스토리 아카이브 로드 실패', err);
    }
  }, [isMe]);

  const followHints = useFollowLocalStore((s) => s.followingHintByUserId);
  useEffect(() => {
    setFollowers((prev) =>
      prev.map((f) => ({
        ...f,
        isFollowing: mergeFollowingHint(f.userId, f.isFollowing),
      }))
    );
    setFollowings((prev) =>
      prev.map((f) => ({
        ...f,
        isFollowing: mergeFollowingHint(f.userId, f.isFollowing),
      }))
    );
  }, [followHints]);

  useEffect(() => {
    if (!targetNickname) return;
    // nickname 이 같아도(예: 홈 → 동일 유저 프로필 재진입) history key 가 바뀌므로 매번 서버에서 다시 받는다.
    // persist 재수화 후 userId 가 채워지면 팔로우 상태 동기화를 위해 한 번 더 받는다.
    fetchProfile(targetNickname, true);
  }, [targetNickname, fetchProfile, location.key, myUserId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !profile?.userId) {
      setProfileStoryRing({ loaded: false, hasActiveStories: false, feedUnread: null });
      return;
    }
    const uid = Number(profile.userId);
    if (!Number.isFinite(uid)) return;
    const gen = ++profileStoryRingGen.current;
    setProfileStoryRing({ loaded: false, hasActiveStories: false, feedUnread: null });
    void (async () => {
      try {
        const [storiesRes, feedRes] = await Promise.all([
          storyApi.getUserStories(uid),
          storyApi.getFeed(),
        ]);
        if (gen !== profileStoryRingGen.current) return;
        const okStories =
          (storiesRes.resultCode?.includes('-S-') || storiesRes.resultCode?.startsWith('200')) &&
          Array.isArray(storiesRes.data);
        const nowMs = Date.now();
        const notExpired = (storiesRes.data || []).filter((s) => {
          if (!s.expiredAt) return true;
          const t = Date.parse(s.expiredAt);
          return !Number.isFinite(t) || t > nowMs;
        });
        const hasActive = okStories && notExpired.length > 0;
        let feedUnread: boolean | null = null;
        if (feedRes.resultCode?.includes('-S-') || feedRes.resultCode?.startsWith('200')) {
          const row = (feedRes.data || []).find((f) => Number(f.userId) === uid);
          if (row) feedUnread = row.isUnread;
        }
        setProfileStoryRing({ loaded: true, hasActiveStories: hasActive, feedUnread });
      } catch {
        if (gen !== profileStoryRingGen.current) return;
        setProfileStoryRing({ loaded: true, hasActiveStories: false, feedUnread: null });
      }
    })();
  }, [isLoggedIn, profile?.userId, location.key]);

  useEffect(() => {
    if (!targetNickname || !myNickname) return;
    const wasSelf = prevViewingSelfRef.current;
    const nowSelf = myNickname === targetNickname;
    prevViewingSelfRef.current = nowSelf;
    const becameSelfProfile = nowSelf && !wasSelf;
    if (!becameSelfProfile) return;
    const myId = myUserId != null ? Number(myUserId) : NaN;
    /** 언팔 등으로 followSync 가 올랐으면 프로필+목록 조용히 재동기화. epoch 가 0이어도 전환 시 목록만 한 번 더 맞춰 헤더·모달과 서버 일치 */
    if (followSyncEpoch > 0) {
      void resyncProfileQuiet(targetNickname);
    } else if (Number.isFinite(myId)) {
      void fetchFollowLists(myId, { forceApplyFollowLists: true });
    }
  }, [targetNickname, myNickname, myUserId, followSyncEpoch, resyncProfileQuiet, fetchFollowLists]);

  useEffect(() => {
    if (!targetNickname) return;

    const handleFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<FollowResponse>).detail;
      const { userId: authUserId, nickname: storeNick } = useAuthStore.getState();
      /** 이벤트 시점에 보고 있는 프로필 — 목록/카운트는 항상 이 유저 기준으로 서버 재동기화 */
      const listOwnerIdRaw = profileRef.current?.userId;
      const listOwnerId =
        listOwnerIdRaw != null && Number.isFinite(Number(listOwnerIdRaw)) ? Number(listOwnerIdRaw) : null;
      const tidNum = detail?.toUserId != null ? Number(detail.toUserId) : NaN;
      const aid = authUserId != null ? Number(authUserId) : NaN;
      /** 내 프로필이면 내 팔로우 관련 변경이 반영될 수 있음 / 남 프로필이면 해당 유저(toUserId)일 때만 목록·카운트 재조회 */
      const shouldRefreshLists =
        detail != null &&
        listOwnerId != null &&
        ((!Number.isNaN(aid) && listOwnerId === aid) ||
          (!Number.isNaN(tidNum) && tidNum === listOwnerId));

      // ref 로 분기하면 axios 콜백이 React 커밋보다 먼저 돌 때 잘못된 분기(또는 미적용)가 난다.
      // 항상 함수형 업데이트 + id 는 Number 로 통일 (JSON Long 문자열 대비).
      if (detail) {
        setProfile((p) => {
          if (!p) return p;
          const pid = Number(p.userId);
          const tid = Number(detail.toUserId);
          const aidLocal = authUserId != null ? Number(authUserId) : NaN;
          const onMyProfileById = !Number.isNaN(aidLocal) && pid === aidLocal;
          const onMyProfileByNick =
            !!storeNick && storeNick !== '' && p.nickname === storeNick;
          if (onMyProfileById || onMyProfileByNick) {
            if (typeof detail.followingCount !== 'number') return p;
            return { ...p, followingCount: detail.followingCount };
          }
          if (tid === pid) {
            /** 토글 중: 이벤트로 isFollowing·followerCount 덮지 않음(구 payload 레이스 방지). 성공 분기·fetchFollowLists가 반영 */
            if (
              suppressFollowEventForTargetIdRef.current != null &&
              suppressFollowEventForTargetIdRef.current === tid
            ) {
              return p;
            }
            if (typeof detail.isFollowing !== 'boolean') {
              return p;
            }
            const next = {
              ...p,
              isFollowing: detail.isFollowing,
              followerCount:
                typeof detail.followerCount === 'number' ? detail.followerCount : p.followerCount,
            };
            return next;
          }
          return p;
        });
      }

      /**
       * 목록 재조회: 프로필 헤더 토글 시 handleFollowToggle 이 이미 fetchFollowLists 를 호출하므로
       * suppress 대상(toUserId)과 같으면 이벤트 쪽 중복 호출을 생략(4개 GET 배치가 두 번 나가는 것 방지).
       */
      if (shouldRefreshLists && listOwnerId != null) {
        const suppressedDuplicateListFetch =
          suppressFollowEventForTargetIdRef.current != null &&
          !Number.isNaN(tidNum) &&
          suppressFollowEventForTargetIdRef.current === tidNum;
        if (!suppressedDuplicateListFetch) {
          const lid = listOwnerId;
          window.setTimeout(() => {
            void fetchFollowLists(lid);
          }, 0);
        }
      }
    };

    window.addEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
  }, [targetNickname, fetchFollowLists]);

  useEffect(() => {
    if (!isMe || activeTab !== 'scraps') return;
    void fetchScrapsInitial();
  }, [isMe, activeTab, fetchScrapsInitial]);

  useEffect(() => {
    if (isMe && activeTab === 'archive' && archivedStories.length === 0) {
      fetchArchivedStories();
    }
  }, [isMe, activeTab, archivedStories.length, fetchArchivedStories]);

  const handleFollowToggle = async () => {
    if (!profile || isMe || isFollowProcessing || followToggleLockRef.current) return;
    followToggleLockRef.current = true;
    const targetId = profile.userId;
    const hinted = useFollowLocalStore.getState().followingHintByUserId[Number(profile.userId)];
    const snapshot = {
      isFollowing: hinted !== undefined ? hinted : profile.isFollowing,
      followerCount: profile.followerCount,
    };
    const nextFollowing = !snapshot.isFollowing;
    const optimisticFollowers = Math.max(0, snapshot.followerCount + (nextFollowing ? 1 : -1));

    setIsFollowProcessing(true);
    // 낙관적 UI (스냅샷은 위에서 고정 — 연타 시 profile 이 이미 뒤집힌 뒤가 아님)
    setProfile((p) =>
      p ? { ...p, isFollowing: nextFollowing, followerCount: optimisticFollowers } : p
    );
    suppressFollowEventForTargetIdRef.current = Number(targetId);
    try {
      const r = await toggleFollowRelation(
        targetId,
        snapshot.isFollowing ? 'unfollow' : 'follow',
        myUserId
      );
      if (r.ok) {
        if (!r.follow.isFollowing && myUserId != null) {
          setFollowers((prev) => prev.filter((f) => Number(f.userId) !== Number(myUserId)));
        }
        // 4단계 성공: FollowResponse 로 정확한 isFollowing·상대 팔로워 수 동기화 (OpenAPI RsDataFollowResponse.data)
        setProfile((p) => {
          if (!p) return p;
          return {
            ...p,
            isFollowing: r.follow.isFollowing,
            followerCount: r.follow.followerCount,
          };
        });
        void fetchFollowLists(Number(targetId), {
          forceApplyFollowLists: true,
          viewerFollowsOwner: r.follow.isFollowing,
        });
      } else if (r.reason === 'busy') {
        setProfile((p) =>
          p ? { ...p, isFollowing: snapshot.isFollowing, followerCount: snapshot.followerCount } : p
        );
      } else {
        setProfile((p) =>
          p ? { ...p, isFollowing: snapshot.isFollowing, followerCount: snapshot.followerCount } : p
        );
        if (r.reason === 'self' || r.reason === 'failed') {
          alert(r.message || '팔로우 처리에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
      setProfile((p) =>
        p ? { ...p, isFollowing: snapshot.isFollowing, followerCount: snapshot.followerCount } : p
      );
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      followToggleLockRef.current = false;
      setIsFollowProcessing(false);
      window.setTimeout(() => {
        suppressFollowEventForTargetIdRef.current = null;
      }, 0);
    }
  };

  const handleMessageClick = async () => {
    if (!profile) return;
    try {
      const res = await dmApi.create1v1Room(profile.userId);
      if (res.resultCode.startsWith('200')) { navigate(`/dm/${res.data.roomId}`); }
    } catch (err) { alert('채팅방을 시작할 수 없습니다.'); }
  };

  const handleHardDeleteStory = async (storyId: number) => {
    if (!window.confirm('이 만료 스토리를 완전히 삭제하시겠습니까?')) return;
    try {
      const res = await storyApi.hardDelete(storyId);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        setArchivedStories(prev => prev.filter(story => story.storyId !== storyId));
      } else {
        alert(res.msg || '스토리 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('스토리 하드 삭제 실패:', err);
      alert('스토리 삭제에 실패했습니다.');
    }
  };

  if (loading && !profile) return <MainLayout title={targetNickname || "Profile"}><div style={{ textAlign: 'center' }}>로딩 중...</div></MainLayout>;
  
  if (error) return (
    <MainLayout title="Error">
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <AlertCircle size={48} color="#ed4956" style={{ margin: '0 auto 20px' }} />
        <p>{error}</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ padding: '8px 16px', backgroundColor: '#efefef', color: '#262626', border: '1px solid #dbdbdb', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            홈으로
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              void fetchProfile(targetNickname!, true);
            }}
            style={{ padding: '8px 16px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            다시 시도
          </button>
        </div>
      </div>
    </MainLayout>
  );

  if (!profile) return null;

  const showStoryRainbowRing =
    profileStoryRing.loaded &&
    profileStoryRing.hasActiveStories &&
    profileStoryRing.feedUnread !== false;
  const showStoryMutedRing =
    profileStoryRing.loaded && profileStoryRing.hasActiveStories && profileStoryRing.feedUnread === false;

  const openProfileStories = () => {
    if (!profileStoryRing.hasActiveStories) return;
    navigate(`/story/${profile.userId}`);
  };

  return (
    <MainLayout title={profile.nickname}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'clamp(20px, 4vw, 40px)',
          marginBottom: '44px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {profileStoryRing.hasActiveStories ? (
          <div
            role="button"
            tabIndex={0}
            title="스토리 보기"
            aria-label={`${profile.nickname}님의 스토리 보기`}
            onClick={() => openProfileStories()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openProfileStories();
              }
            }}
            style={{
              boxSizing: 'border-box',
              width: '154px',
              height: '154px',
              flexShrink: 0,
              borderRadius: '50%',
              padding: '2px',
              background: showStoryRainbowRing
                ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                : showStoryMutedRing
                  ? '#dbdbdb'
                  : '#dbdbdb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#efefef',
              }}
            >
              <ProfileAvatar
                fillContainer
                authorUserId={profile.userId}
                profileImageUrl={profile.profileImageUrl}
                nickname={profile.nickname}
              />
            </div>
          </div>
        ) : (
          <ProfileAvatar
            authorUserId={profile.userId}
            profileImageUrl={profile.profileImageUrl}
            nickname={profile.nickname}
            sizePx={150}
            style={{ border: '1px solid #dbdbdb', flexShrink: 0, alignSelf: 'flex-start' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: '300' }}>{profile.nickname}</span>
            {isMe ? (
              <>
                <button onClick={() => navigate('/profile/edit')} style={{ padding: '6px 16px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>프로필 편집</button>
                <LogOut size={22} style={{ cursor: 'pointer', color: '#ed4956' }} onClick={() => { void performClientLogout(navigate); }} />
              </>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleFollowToggle} disabled={isFollowProcessing} style={{ padding: '6px 24px', backgroundColor: displayIsFollowingOthersProfile ? '#efefef' : '#0095f6', color: displayIsFollowingOthersProfile ? '#000' : '#fff', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', opacity: isFollowProcessing ? 0.85 : 1 }}>{displayIsFollowingOthersProfile ? '팔로잉' : '팔로우'}</button>
                <button onClick={handleMessageClick} style={{ padding: '6px 16px', backgroundColor: '#efefef', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>메시지 보내기</button>
                {profile.isFollower && <span style={{ fontSize: '0.75rem', color: '#8e8e8e' }}>나를 팔로우함</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px, 4vw, 40px)', marginBottom: '20px' }}>
            <span>게시물 <strong>{getProfilePostCountLabel(profile)}</strong></span>
            <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로워', id: profile.userId, type: 'followers' })}>
              팔로워 <strong>{profile.followerCount}</strong>
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => setModalConfig({ title: '팔로잉', id: profile.userId, type: 'followings' })}>
              팔로잉 <strong>{profile.followingCount}</strong>
            </span>
          </div>
          <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {profile.nickname}
            <div style={{ display: 'flex', gap: '5px' }}>
              {profile.techStacks?.map(tech => (
                <span key={tech.id} style={{ fontSize: '0.7rem', color: tech.color, backgroundColor: `${tech.color}15`, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${tech.color}30` }}>{tech.name}</span>
              ))}
            </div>
          </div>
          <div style={{ color: '#8e8e8e', marginTop: '5px' }}>{RESUME_MAP[profile.resume]}</div>
          {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#00376b', textDecoration: 'none', display: 'block', marginTop: '5px' }}>{profile.githubUrl}</a>}
        </div>
      </header>

      <div className={`profile-tab-grid ${isMe ? 'profile-tab-grid--cols-4' : 'profile-tab-grid--cols-2'}`}>
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 8px',
            borderTop: activeTab === 'posts' ? '1px solid #262626' : 'none',
            marginTop: '-1px',
            cursor: 'pointer',
            color: activeTab === 'posts' ? '#262626' : '#8e8e8e',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            minWidth: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Grid size={12} /> 게시물
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tech')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 8px',
            borderTop: activeTab === 'tech' ? '1px solid #262626' : 'none',
            marginTop: '-1px',
            cursor: 'pointer',
            color: activeTab === 'tech' ? '#262626' : '#8e8e8e',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            minWidth: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart2 size={12} /> 기술 레벨
        </button>
        {isMe && (
          <button
            type="button"
            onClick={() => setActiveTab('scraps')}
            style={{
              background: 'none',
              border: 'none',
              padding: '15px 8px',
              borderTop: activeTab === 'scraps' ? '1px solid #262626' : 'none',
              marginTop: '-1px',
              cursor: 'pointer',
              color: activeTab === 'scraps' ? '#262626' : '#8e8e8e',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minWidth: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Bookmark size={12} /> 저장됨
            {activeTab === 'scraps' && scrapsTotalElements != null ? (
              <span style={{ fontWeight: 600, color: '#8e8e8e' }}>({scrapsTotalElements})</span>
            ) : null}
          </button>
        )}
        {isMe && (
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            style={{
              background: 'none',
              border: 'none',
              padding: '15px 8px',
              borderTop: activeTab === 'archive' ? '1px solid #262626' : 'none',
              marginTop: '-1px',
              cursor: 'pointer',
              color: activeTab === 'archive' ? '#262626' : '#8e8e8e',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minWidth: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Clock3 size={12} /> 만료 스토리
          </button>
        )}
      </div>

      <div className="profile-tab-body">
        {activeTab === 'posts' && (
          <>
            <div className="profile-tab-grid-3">
              {profile.posts.content.map((post) => (
                <div key={post.id} className="profile-tab-thumb" style={{ aspectRatio: '1/1' }} onClick={() => navigate(`/post/${post.id}`)}>
                  {post.medias[0] && (
                    isVideo(post.medias[0].mediaType) ? (
                      <video
                        src={getFullUrl(post.medias[0].sourceUrl)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        playsInline
                        onError={(e) => {
                          const video = e.currentTarget;
                          if (video.dataset.fallbackApplied === '1') return;
                          const fallback = getFallbackUrl(post.medias[0].sourceUrl);
                          if (fallback) {
                            video.dataset.fallbackApplied = '1';
                            video.src = fallback;
                            video.load();
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={getFullUrl(post.medias[0].sourceUrl)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="thumb"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallbackApplied === '1') return;
                          const fallback = getFallbackUrl(post.medias[0].sourceUrl);
                          if (fallback) {
                            img.dataset.fallbackApplied = '1';
                            img.src = fallback;
                          }
                        }}
                      />
                    )
                  )}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', gap: '20px' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Heart size={20} fill="white" /> {post.likeCount}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MessageCircle size={20} fill="white" /> {post.commentCount}</div>
                  </div>
                </div>
              ))}
            </div>
            {!profile.posts.last && profile.posts.content.length > 0 && (
              <button
                type="button"
                className="profile-tab-load-more"
                onClick={() => void loadMoreProfilePosts()}
                disabled={postsLoadingMore}
              >
                {postsLoadingMore ? '불러오는 중…' : '게시물 더 보기'}
              </button>
            )}
          </>
        )}
        {activeTab === 'scraps' && (
          <>
            <div className="profile-tab-grid-3">
              {scrappedPosts.map((post) => (
                <div key={post.id} className="profile-tab-thumb" style={{ aspectRatio: '1/1' }} onClick={() => navigate(`/post/${post.id}`)}>
                  {post.medias[0] && (
                    isVideo(post.medias[0].mediaType) ? (
                      <video
                        src={getFullUrl(post.medias[0].sourceUrl)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        playsInline
                        onError={(e) => {
                          const video = e.currentTarget;
                          if (video.dataset.fallbackApplied === '1') return;
                          const fallback = getFallbackUrl(post.medias[0].sourceUrl);
                          if (fallback) {
                            video.dataset.fallbackApplied = '1';
                            video.src = fallback;
                            video.load();
                          }
                        }}
                      />
                    ) : (
                      <img
                        src={getFullUrl(post.medias[0].sourceUrl)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="thumb"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallbackApplied === '1') return;
                          const fallback = getFallbackUrl(post.medias[0].sourceUrl);
                          if (fallback) {
                            img.dataset.fallbackApplied = '1';
                            img.src = fallback;
                          }
                        }}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
            {!scrapsLast && scrappedPosts.length > 0 && (
              <button
                type="button"
                className="profile-tab-load-more"
                onClick={() => void loadMoreScraps()}
                disabled={scrapsLoadingMore}
              >
                {scrapsLoadingMore ? '불러오는 중…' : '저장됨 더 보기'}
              </button>
            )}
          </>
        )}
        {activeTab === 'tech' && (
          <div className="profile-tab-grid-3 profile-tab-grid-3--single">
            <div className="profile-tab-tech-inner">
              <h3 className="profile-tab-section-title">기술 스택 숙련도</h3>
              <p className="profile-tab-section-desc">
                각 축은 기술 항목이며, 중심에서 멀수록 점수가 높습니다. (최대 100점 기준)
              </p>
              {profile.topTechScores && profile.topTechScores.length > 0 ? (
                <TechRadarChart scores={profile.topTechScores} maxScore={100} />
              ) : (
                <div className="profile-tab-empty">
                  <p style={{ margin: 0 }}>아직 활동 데이터가 부족합니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'archive' && (
          <div className="profile-tab-grid-3">
            {archivedStories.map((story) => (
              <div key={story.storyId} className="profile-tab-thumb" style={{ aspectRatio: '9/16' }}>
                {story.mediaType.toLowerCase().includes('mp4') || story.mediaType.toLowerCase().includes('webm') || story.mediaType.toLowerCase().includes('mov') ? (
                  <video
                    src={getFullUrl(story.mediaUrl)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const video = e.currentTarget;
                      if (video.dataset.fallbackApplied === '1') return;
                      const fallback = getFallbackUrl(story.mediaUrl);
                      if (fallback) {
                        video.dataset.fallbackApplied = '1';
                        video.src = fallback;
                        video.load();
                      }
                    }}
                  />
                ) : (
                  <img
                    src={getFullUrl(story.mediaUrl)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="archived-story"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallbackApplied === '1') return;
                      const fallback = getFallbackUrl(story.mediaUrl);
                      if (fallback) {
                        img.dataset.fallbackApplied = '1';
                        img.src = fallback;
                      }
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleHardDeleteStory(story.storyId)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="스토리 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {archivedStories.length === 0 && (
              <div className="profile-tab-empty">
                <p style={{ margin: 0 }}>만료된 스토리가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {modalConfig && (
        <UserListModal
          title={modalConfig.title}
          id={modalConfig.id}
          type={modalConfig.type}
          seedUsers={modalConfig.type === 'followers' ? followers : followings}
          viewerFollowsProfileOwner={
            modalConfig.type === 'followers' ? isMe || displayIsFollowingOthersProfile : true
          }
          onClose={() => setModalConfig(null)}
        />
      )}
    </MainLayout>
  );
};

export default ProfilePage;
