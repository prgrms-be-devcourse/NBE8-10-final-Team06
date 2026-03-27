import client from './client';
import { RsData } from '../types/common';
import { TechTagRes } from '../types/post';

export const technologyApi = {
  // OpenAPI 계약에 기술스택 목록 엔드포인트가 없어 호출하지 않음
  getTechnologies: async (): Promise<RsData<TechTagRes[]>> => ({
    resultCode: '200',
    msg: 'TECH_ENDPOINT_NOT_IN_OPENAPI_CONTRACT',
    data: [],
  }),
};
