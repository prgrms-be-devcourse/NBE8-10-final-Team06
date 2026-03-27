import { Slice } from "./common";
import { PostFeedProfileRes, TechTagRes } from "./post";

export interface FollowUserResponse {
  id: number;
  nickname: string;
  email: string;
  profileImageUrl: string | null;
}

export interface FollowResponse {
  toUserId: number;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

/**
 * com.devstagram.domain.user.dto.UserSearchResponse
 */
export interface UserSearchResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

/**
 * com.devstagram.domain.user.entity.Gender
 */
export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

/**
 * com.devstagram.domain.user.entity.Resume
 */
export enum Resume {
  UNSPECIFIED = "UNSPECIFIED",
  UNDERGRADUATE = "UNDERGRADUATE",
  JUNIOR = "JUNIOR",
  INTERMEDIATE = "INTERMEDIATE",
  SENIOR = "SENIOR",
}

/**
 * com.devstagram.domain.technology.dto.TechScoreDto
 */
export interface TechScoreDto {
  techName: string;
  score: number;
}

/**
 * com.devstagram.domain.user.dto.UserProfileResponse
 */
export interface UserProfileResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string;
  birthDate: string; // LocalDate (ISO 8601 string)
  gender: Gender;
  githubUrl: string;
  resume: Resume;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollower: boolean; // 추가
  techStacks: TechTagRes[]; // 추가
  topTechScores: TechScoreDto[];
  posts: Slice<PostFeedProfileRes>;
}

/**
 * com.devstagram.domain.user.dto.ProfileUpdateRequest
 */
export interface ProfileUpdateRequest {
  nickname: string;
  githubUrl: string;
  resume: Resume;
  birthDate: string;
  gender: Gender;
  techIds: number[]; // 추가
}
