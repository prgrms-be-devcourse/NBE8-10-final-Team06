import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';

/**
 * 마크다운을 일반 텍스트로 바꿉니다. 최상위 블록은 빈 줄 두 개로 구분합니다.
 * (목록·표 등은 한 블록으로 합쳐질 수 있습니다.)
 */
export function stripMarkdownToPlainText(source: string): string {
  if (!source.trim()) return source;

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .parse(source) as Root;

  const parts = tree.children
    .map((node) => toString(node, { includeHtml: false }).trim())
    .filter((s) => s.length > 0);

  return parts.join('\n\n');
}
