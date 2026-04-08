import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

/**
 * 피드·상세·작성 미리보기 공통: 이미지 태그 제외, 링크는 http(s)/mailto, 코드 하이라이트(span/class) 허용.
 */
export const postBodySanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => !['img', 'picture', 'source'].includes(t)),
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ['className', /^language-./],
      ['className', /^hljs$/],
      ['className', /^hljs-[a-zA-Z0-9_-]+$/],
    ],
    span: [['className', /^hljs-[a-zA-Z0-9_-]+$/]],
  },
};
