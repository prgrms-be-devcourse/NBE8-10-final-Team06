import type { RsData } from '../types/common';

/** RsData<boolean> 의 data 가 boolean / 문자열 / 누락인 경우까지 안전하게 읽기 */
export function readRsDataBoolean(rs: RsData<boolean> | null | undefined): boolean | null {
  if (!rs || rs.data === undefined || rs.data === null) return null;
  const d = rs.data as unknown;
  if (typeof d === 'boolean') return d;
  if (typeof d === 'string') {
    const s = d.trim().toLowerCase();
    if (s === 'true' || s === 'false') return s === 'true';
  }
  if (typeof d === 'number') return d !== 0;
  return null;
}

/** status API 파싱 실패 시 UI/서버 추정값으로 대체 */
export function readFollowStatusFromRsData(st: RsData<boolean>, fallback: boolean): boolean {
  const b = readRsDataBoolean(st);
  if (b !== null) return b;
  return fallback;
}
