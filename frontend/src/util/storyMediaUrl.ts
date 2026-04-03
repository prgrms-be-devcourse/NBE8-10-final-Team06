/** 스토리 미디어가 로컬 업로드가 아닌 원격 URL인지 (백엔드 로컬 스토리지 삭제와 호환되지 않을 수 있음) */
export function isRemoteStoryMediaUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== 'string') return false;
  const t = url.trim().toLowerCase();
  return t.startsWith('http://') || t.startsWith('https://');
}
