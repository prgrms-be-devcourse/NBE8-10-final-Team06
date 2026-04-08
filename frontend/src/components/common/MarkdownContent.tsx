import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { remarkReplaceImagesWithText } from '../../util/remarkReplaceImagesWithText';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { isAllowedMarkdownHref } from '../../util/postMarkdownInsert';
import { postBodySanitizeSchema } from '../../util/postMarkdownSanitizeSchema';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  plaintext: 'Plain Text',
  java: 'Java',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  kotlin: 'Kotlin',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  sql: 'SQL',
  bash: 'Bash',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
};

const markdownComponents: Components = {
  /**
   * fenced code는 hast 상 pre > code 인데, 커스텀 code가 div·pre를 쓰므로
   * 기본 pre 래퍼를 제거하지 않으면 <pre><div>… 가 되어 DOM이 깨지고 스타일이 어긋남.
   */
  pre({ children }) {
    return <>{children}</>;
  },
  a({ href, children, ...props }) {
    if (!href || !isAllowedMarkdownHref(href)) {
      return <span className="markdown-link-fallback">{children}</span>;
    }
    const isMailto = /^mailto:/i.test(href);
    return (
      <a {...props} href={href} target={isMailto ? undefined : '_blank'} rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img({ alt }) {
    return (
      <span className="markdown-img-omitted" title="본문에는 이미지를 넣을 수 없습니다. 미디어로 첨부해 주세요.">
        {alt ? `[이미지: ${alt}]` : '[이미지]'}
      </span>
    );
  },
  code({ className: codeClassName, children, ...props }) {
    const languageKey = codeClassName?.match(/language-([\w#+-]+)/)?.[1]?.toLowerCase();
    const language = languageKey ? (LANGUAGE_LABELS[languageKey] ?? languageKey) : '';
    const isBlock = Boolean(languageKey);

    if (!isBlock) {
      return (
        <code className={codeClassName} {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="markdown-code-block">
        <span className="markdown-code-lang">{language}</span>
        <pre>
          <code className={codeClassName} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
};

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  return (
    <div className={`markdown-content${className ? ` ${className}` : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkReplaceImagesWithText, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, postBodySanitizeSchema]]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
