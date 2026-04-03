import type { NavigateFunction } from 'react-router-dom';
import { userApi } from '../api/user';
import { useAuthStore } from '../store/useAuthStore';
import { getApiErrorMessage } from '../util/apiError';
import { isRsDataSuccess } from '../util/rsData';

/** 회원 탈퇴 성공 시에만 로컬·쿠키 세션 정리 후 로그인 화면으로 이동 */
export async function performClientWithdraw(navigate: NavigateFunction): Promise<void> {
  try {
    const res = await userApi.withdraw();
    if (isRsDataSuccess(res)) {
      useAuthStore.getState().setLogout();
      navigate('/login?reason=withdrawn');
      return;
    }
    alert(res.msg || '회원 탈퇴에 실패했습니다.');
  } catch (err: unknown) {
    alert(getApiErrorMessage(err, '회원 탈퇴 중 오류가 발생했습니다.'));
  }
}
