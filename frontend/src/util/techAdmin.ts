import { authApi } from '../api/auth';
import { isRsDataSuccess } from './rsData';

export const TECH_ADMIN_NICKNAME = 'admin';
export const TECH_ADMIN_EMAIL = 'admin@test.com';

export async function isTechAdminSession(localNickname: string | null | undefined): Promise<boolean> {
  if (!localNickname || localNickname !== TECH_ADMIN_NICKNAME) return false;
  try {
    const res = await authApi.me();
    if (!isRsDataSuccess(res)) return false;
    const d = res.data;
    return !!(d?.email === TECH_ADMIN_EMAIL && d?.nickname === TECH_ADMIN_NICKNAME);
  } catch {
    return false;
  }
}
