import client from './client';
import { RsData } from '../types/common';
import { TechTagRes } from '../types/post';

export const technologyApi = {
  // 기술 스택 전체 목록 조회
  getTechnologies: () =>
    client.get<RsData<TechTagRes[]>>('/technologies').then(res => res.data),
};
