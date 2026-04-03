// src/types/common.ts

/**
 * 백엔드 공통 응답 규격 RsData
 */
export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

/**
 * 페이지네이션 응답 규격 (Spring Data Slice/Page 대응)
 */
export interface Slice<T> {
  content: T[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** Spring Data Page (예: 스크랩 목록) */
export interface Page<T> extends Slice<T> {
  totalPages: number;
  totalElements: number;
}
