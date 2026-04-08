import { TechTagRes } from './post';

export interface TechCategoryInfoRes {
  id: number;
  name: string;
  color: string;
}

export interface TechCreateReq {
  categoryId: number;
  name: string;
  color: string;
}

export interface TechUpdateReq {
  categoryId: number;
  name: string;
  color: string;
  iconUrl: string;
}

export interface TechCategoryCreateReq {
  name: string;
  color: string;
}

export interface TechCategoryUpdateReq extends TechCategoryCreateReq {}

export type { TechTagRes };
