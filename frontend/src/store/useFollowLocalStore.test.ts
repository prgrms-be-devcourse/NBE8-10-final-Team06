import { describe, it, expect, beforeEach } from 'vitest';
import { useFollowLocalStore, mergeFollowingHint } from './useFollowLocalStore';

describe('useFollowLocalStore', () => {
  beforeEach(() => {
    useFollowLocalStore.getState().clearFollowingHints();
  });

  it('mergeFollowingHint는 힌트가 있으면 API 값보다 힌트를 쓴다', () => {
    useFollowLocalStore.getState().setFollowingHint(42, false);
    expect(mergeFollowingHint(42, true)).toBe(false);
    useFollowLocalStore.getState().setFollowingHint(42, true);
    expect(mergeFollowingHint(42, false)).toBe(true);
  });

  it('힌트가 없으면 API 값을 그대로 쓴다', () => {
    expect(mergeFollowingHint(99, true)).toBe(true);
    expect(mergeFollowingHint(99, false)).toBe(false);
  });

  it('emit 경로와 동일하게 userId 키로 저장된다', () => {
    useFollowLocalStore.getState().setFollowingHint(7, true);
    expect(useFollowLocalStore.getState().followingHintByUserId[7]).toBe(true);
  });

  it('userId별 힌트는 독립이다', () => {
    useFollowLocalStore.getState().setFollowingHint(1, true);
    expect(mergeFollowingHint(2, false)).toBe(false);
  });
});
