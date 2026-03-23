// src/types/common.ts
export interface RsData<T> {
  resultCode: string;
  msg: string;
  data: T;
}

export type Gender = 'MALE' | 'FEMALE';

export type Resume = 'UNDERGRADUATE' | 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR';
