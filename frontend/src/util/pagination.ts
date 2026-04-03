/** `id` 필드 기준 중복 없이 리스트 확장 (좋아요 모달 등) */
export function appendRowsByUniqueId<T extends { id: number }>(prev: T[], more: T[]): T[] {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...more.filter((m) => !seen.has(m.id))];
}
