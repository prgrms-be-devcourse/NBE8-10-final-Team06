export type Int64 = number;
export type Int32 = number;
export type IsoDate = string;
export type IsoDateTime = string;

export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

export interface SortObject {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

export interface PageableObject {
  offset: Int64;
  sort: SortObject;
  paged: boolean;
  unpaged: boolean;
  pageSize: Int32;
  pageNumber: Int32;
}

export interface SliceResponse<T> {
  size: Int32;
  content: T[];
  number: Int32;
  sort: SortObject;
  first: boolean;
  last: boolean;
  numberOfElements: Int32;
  pageable: PageableObject;
  empty: boolean;
}

export interface PageResponse<T> extends SliceResponse<T> {
  totalPages: Int32;
  totalElements: Int64;
}

export type Gender = "MALE" | "FEMALE";
export type Resume = "UNSPECIFIED" | "UNDERGRADUATE" | "JUNIOR" | "INTERMEDIATE" | "SENIOR";
export type MediaType = "jpg" | "jpeg" | "gif" | "png" | "webp" | "mp4" | "webm" | "mov";
export type DmMessageType = "TEXT" | "POST" | "STORY" | "IMAGE" | "SYSTEM";

export interface SignupRequest {
  nickname: string;
  email: string;
  password: string;
  birthDate: IsoDate;
  gender: Gender;
  githubUrl?: string;
  resume: Resume;
}

export interface SignupResponse {
  id: Int64;
  nickname: string;
  email: string;
  apiKey: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileUpdateRequest {
  nickname: string;
  githubUrl?: string;
  resume: Resume;
  birthDate: IsoDate;
  gender: Gender;
}

export interface TechTagRes {
  id: Int64;
  name: string;
  color: string;
}

export interface TechScoreDto {
  techName: string;
  score: Int32;
}

export interface PostMediaRes {
  id: Int64;
  sourceUrl: string;
  sequence: Int32;
  mediaType: MediaType;
}

export interface PostFeedProfileRes {
  id: Int64;
  medias: PostMediaRes[];
  techStacks: TechTagRes[];
  likeCount: Int64;
  commentCount: Int64;
}

export interface UserProfileResponse {
  userId: Int64;
  nickname: string;
  profileImageUrl: string;
  birthDate: IsoDate;
  gender: Gender;
  githubUrl: string;
  resume: Resume;
  postCount: Int64;
  followerCount: Int64;
  followingCount: Int64;
  isFollowing: boolean;
  topTechScores: TechScoreDto[];
  posts: SliceResponse<PostFeedProfileRes>;
}

export interface UserSearchResponse {
  userId: Int64;
  nickname: string;
  profileImageUrl: string;
  isFollowing: boolean;
}

export interface FollowResponse {
  toUserId: Int64;
  isFollowing: boolean;
  followerCount: Int64;
  followingCount: Int64;
}

export interface FollowUserResponse {
  userId: Int64;
  nickname: string;
  profileImageUrl: string;
  isFollowing: boolean;
}

export interface PostCreateReq {
  title: string;
  content: string;
  techIds?: Int64[];
}

export interface PostUpdateReq {
  title: string;
  content: string;
  techIds?: Int64[];
}

export interface PostFeedRes {
  id: Int64;
  authorId: Int64;
  nickname: string;
  title: string;
  content: string;
  medias: PostMediaRes[];
  techStacks: TechTagRes[];
  isLiked: boolean;
  isScrapped: boolean;
  isMine: boolean;
  profileImageUrl: string;
  likeCount: Int64;
  commentCount: Int64;
  createdAt: IsoDateTime;
}

export interface CommentInfoRes {
  id: Int64;
  userId: Int64;
  content: string;
  nickname: string;
  isLiked: boolean;
  isMine: boolean;
  profileImageUrl: string;
  createdAt: IsoDateTime;
  modifiedAt: IsoDateTime;
  replyCount: Int64;
}

export interface ReplyInfoRes {
  id: Int64;
  userId: Int64;
  content: string;
  nickname: string;
  createdAt: IsoDateTime;
  modifiedAt: IsoDateTime;
}

export interface PostDetailRes {
  id: Int64;
  authorId: Int64;
  nickname: string;
  title: string;
  content: string;
  likeCount: Int64;
  commentCount: Int64;
  isLiked: boolean;
  isScrapped: boolean;
  isMine: boolean;
  profileImageUrl: string;
  createdAt: IsoDateTime;
  medias: PostMediaRes[];
  techStacks: TechTagRes[];
  comments: SliceResponse<CommentInfoRes>;
}

export interface PostLikerRes {
  userId: Int64;
  nickname: string;
}

export interface CommentCreateReq {
  content: string;
  parentCommentId?: Int64;
}

export interface CommentUpdateReq {
  content: string;
}

export interface StoryViewerUserResponse {
  userId: Int64;
  nickname: string;
  profileImageUrl: string | null;
  isLiked: boolean;
  viewedAt: IsoDateTime;
  likedAt: IsoDateTime | null;
}

export interface StoryFeedResponse {
  userId: Int64;
  nickname: string;
  profileImageUrl: string;
  isUnread: boolean;
  totalStoryCount: Int32;
  lastUpdatedAt: IsoDateTime;
  isMe: boolean;
}

export interface StoryDetailResponse {
  storyId: Int64;
  userId: Int64;
  nickname: string;
  profileImageUrl: string;
  createdAt: IsoDateTime;
  expiredAt: IsoDateTime;
  content: string;
  mediaUrl: string;
  mediaType: MediaType;
  taggedUserIds: Int64[];
  totalLikeCount: Int64;
  isLiked: boolean;
  viewers: StoryViewerUserResponse[] | null;
  likers: StoryViewerUserResponse[] | null;
}

export interface StoryViewResponse {
  storyId: Int64;
  userId: Int64;
  totalLikeCount: Int64;
  isLiked: boolean;
  viewedAt: IsoDateTime;
  likedAt: IsoDateTime;
}

export interface StoryCreateRequestFormFields {
  content?: string;
  tagUserIds?: Int64[];
  mediaType?: MediaType;
  thumbnailUrl?: string;
  file?: File;
}

export interface StoryCreateResponse {
  storyId: Int64;
  userId: Int64;
  createdAt: IsoDateTime;
  expiredAt: IsoDateTime;
  content: string;
  taggedUserIds: Int64[];
}

export interface DmRoomParticipantSummary {
  userId: Int64;
  email: string;
  nickname: string;
  profileImageUrl: string;
}

export interface DmMessageResponse {
  id: Int64;
  type: DmMessageType;
  content: string;
  thumbnail: string;
  valid: boolean;
  createdAt: IsoDateTime;
  senderId: Int64;
}

export interface DmRoomSummaryResponse {
  roomId: Int64;
  roomName: string;
  isGroup: boolean;
  lastMessage: DmMessageResponse;
  joinedAt: IsoDateTime;
  participants: DmRoomParticipantSummary[];
  unreadCount: Int64;
}

export interface DmMessageSliceResponse {
  messages: DmMessageResponse[];
  nextCursor: Int64;
  hasNext: boolean;
}

export interface DmGroupRoomCreateRequest {
  name?: string;
  userIds?: Int64[];
}

export interface DmCreate1v1WithRoomListResponse {
  roomId: Int64;
  rooms: DmRoomSummaryResponse[];
}

export interface DmCreateGroupWithRoomListResponse {
  roomId: Int64;
  rooms: DmRoomSummaryResponse[];
}
