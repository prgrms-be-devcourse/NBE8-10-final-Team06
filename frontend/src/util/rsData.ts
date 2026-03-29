/** 백엔드 RsData.resultCode 성공 판별 (200-S-1 등) */
export function isRsSuccess(resultCode: string | undefined | null): boolean {
  if (!resultCode) return false;
  return resultCode.startsWith('200') || resultCode.includes('-S-');
}

/** RsData 전체 객체에 대한 성공 판별 (기존 호출부 호환) */
export function isRsDataSuccess(res: { resultCode?: string | null } | null | undefined): boolean {
  return isRsSuccess(res?.resultCode ?? null);
}
