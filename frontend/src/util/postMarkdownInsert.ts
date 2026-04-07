/**
 * 포스트 본문 textarea에 마크다운 조각을 넣을 때 커서·선택 영역을 유지합니다.
 */
export function insertInTextarea(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (next: string) => void,
  snippet: string,
  selectionOffset?: { start: number; end: number }
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const next = before + snippet + after;
  setValue(next);

  const relStart = selectionOffset?.start ?? snippet.length;
  const relEnd = selectionOffset?.end ?? snippet.length;
  const posStart = start + relStart;
  const posEnd = start + relEnd;

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(posStart, posEnd);
  });
}

export function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (next: string) => void,
  wrapStart: string,
  wrapEnd: string,
  emptyPlaceholder: string
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const inner = selected || emptyPlaceholder;
  const snippet = wrapStart + inner + wrapEnd;
  insertInTextarea(textarea, value, setValue, snippet, {
    start: wrapStart.length,
    end: wrapStart.length + inner.length,
  });
}

/** 현재 줄 앞에 접두어를 붙입니다(이미 동일 접두어로 시작하면 제거). */
export function toggleLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (next: string) => void,
  prefix: string
): void {
  const pos = textarea.selectionStart;
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const lineEndIdx = value.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const indent = line.match(/^(\s*)/)?.[1] ?? '';
  const body = line.slice(indent.length);

  let nextLine: string;
  if (body.startsWith(prefix)) {
    nextLine = indent + body.slice(prefix.length);
  } else {
    nextLine = indent + prefix + body;
  }

  const next = value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  setValue(next);
  const delta = nextLine.length - line.length;
  requestAnimationFrame(() => {
    textarea.focus();
    const newPos = Math.min(Math.max(0, pos + delta), lineStart + nextLine.length);
    textarea.setSelectionRange(newPos, newPos);
  });
}

/**
 * 현재 줄에 마크다운 제목(# ~ ###)을 적용합니다.
 * 같은 레벨을 다시 적용하면 제목을 제거합니다.
 * 이미 다른 레벨 제목이 있으면 해당 레벨로 바꿉니다.
 */
export function setHeadingLevel(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (next: string) => void,
  level: 1 | 2 | 3
): void {
  const pos = textarea.selectionStart;
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const lineEndIdx = value.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const indent = line.match(/^(\s*)/)?.[1] ?? '';
  const body = line.slice(indent.length);

  const headingMatch = body.match(/^(#{1,6})\s(.*)$/);
  let currentLevel = 0;
  let content = body;
  if (headingMatch) {
    currentLevel = headingMatch[1].length;
    content = headingMatch[2];
  }

  const prefix = `${'#'.repeat(level)} `;
  const nextLine =
    currentLevel === level ? indent + content : indent + prefix + content;

  const next = value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  setValue(next);
  const delta = nextLine.length - line.length;
  requestAnimationFrame(() => {
    textarea.focus();
    const newPos = Math.min(Math.max(0, pos + delta), lineStart + nextLine.length);
    textarea.setSelectionRange(newPos, newPos);
  });
}

/** http(s) / mailto 만 허용 */
export function isAllowedMarkdownHref(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return false;
  }
  return /^https?:\/\//i.test(t) || /^mailto:/i.test(t);
}
