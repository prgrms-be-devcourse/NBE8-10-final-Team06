import type { RsData } from '../types/common';

/** Spring RsData 성공 코드 (예: 200-0, …-S-…) */
export function isRsDataSuccess(res: Pick<RsData<unknown>, 'resultCode'> | undefined | null): boolean {
  const c = res?.resultCode;
  return !!(c?.includes('-S-') || c?.startsWith('200'));
}
