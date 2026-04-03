import client from './client';
import { RsData } from '../types/common';
import { TechTagRes } from '../types/post';
import {
  TechCategoryCreateReq,
  TechCategoryInfoRes,
  TechCategoryUpdateReq,
  TechCreateReq,
  TechUpdateReq,
} from '../types/technology';

export const technologyApi = {
  getTechnologies: async (): Promise<RsData<TechTagRes[]>> =>
    client.get<RsData<TechTagRes[]>>('/technologies').then((res) => res.data),

  getTechCategories: async (): Promise<RsData<TechCategoryInfoRes[]>> =>
    client.get<RsData<TechCategoryInfoRes[]>>('/technologies/categories').then((res) => res.data),

  createTech: async (req: TechCreateReq): Promise<RsData<void>> =>
    client.post<RsData<void>>('/technologies', req).then((res) => res.data),

  updateTech: async (technologyId: number, req: TechUpdateReq): Promise<RsData<void>> =>
    client.put<RsData<void>>(`/technologies/${technologyId}`, req).then((res) => res.data),

  deleteTech: async (technologyId: number): Promise<RsData<void>> =>
    client.delete<RsData<void>>(`/technologies/${technologyId}`).then((res) => res.data),

  createTechCategory: async (req: TechCategoryCreateReq): Promise<RsData<void>> =>
    client.post<RsData<void>>('/technologies/categories', req).then((res) => res.data),

  updateTechCategory: async (
    categoryId: number,
    req: TechCategoryUpdateReq,
  ): Promise<RsData<void>> =>
    client.put<RsData<void>>(`/technologies/categories/${categoryId}`, req).then((res) => res.data),

  deleteTechCategory: async (categoryId: number): Promise<RsData<void>> =>
    client.delete<RsData<void>>(`/technologies/categories/${categoryId}`).then((res) => res.data),
};
