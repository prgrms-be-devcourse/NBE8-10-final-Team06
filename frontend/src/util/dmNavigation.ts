export type DmLocationState = {
  from?: string;
  listFrom?: string;
};

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return '/';
  return trimmed;
}

export function isDmPath(path: string): boolean {
  const p = normalizePath(path);
  return p === '/dm' || p.startsWith('/dm/');
}

export function sanitizeBackTarget(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  const p = normalizePath(candidate);
  if (p === '/login' || p === '/signup') return fallback;
  return p;
}

export function buildPathWithSearch(pathname: string, search: string): string {
  const p = normalizePath(pathname);
  if (!search) return p;
  return `${p}${search}`;
}
