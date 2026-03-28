import type { NavigateFunction } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/useAuthStore';

/** 서버 로그아웃 시도 후 항상 로컬 세션 정리 및 로그인 화면으로 이동 */
export async function performClientLogout(navigate: NavigateFunction): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    /* 서버 오류여도 클라이언트 세션은 정리 */
  } finally {
    useAuthStore.getState().setLogout();
    navigate('/login');
  }
}
