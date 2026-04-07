import type { Plugin } from 'unified';
import type { Parent, Root } from 'mdast';

/**
 * 마크다운 이미지 문법을 렌더하지 않고 안내 문구로 치환합니다(미디어 첨부 사용 유도).
 */
export const remarkReplaceImagesWithText: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const walk = (node: Parent) => {
      const children = node.children;
      if (!children) return;
      for (let i = 0; i < children.length; i++) {
        const n = children[i];
        if (n.type === 'image') {
          const alt = typeof n.alt === 'string' ? n.alt : '';
          children[i] = {
            type: 'text',
            value: alt ? `[이미지: ${alt}]` : '[이미지]',
          };
          continue;
        }
        if ('children' in n && Array.isArray((n as Parent).children)) {
          walk(n as Parent);
        }
      }
    };
    walk(tree);
  };
};
