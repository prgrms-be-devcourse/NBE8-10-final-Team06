import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Link,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table,
  Code,
  ChevronDown,
  RemoveFormatting,
} from 'lucide-react';
import {
  insertInTextarea,
  wrapSelection,
  toggleLinePrefix,
  setHeadingLevel,
  isAllowedMarkdownHref,
} from '../../util/postMarkdownInsert';
import { stripMarkdownToPlainText } from '../../util/stripMarkdownToPlainText';

const TABLE_TEMPLATE = `| 열1 | 열2 |
| --- | --- |
|   |   |
`;

const btnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
};

interface PostMarkdownFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  /** 서식 삽입 시 작성 탭으로 전환 */
  onRequestWriteMode?: () => void;
}

const headingMenuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#1e293b',
  cursor: 'pointer',
  borderRadius: 6,
};

const PostMarkdownFormatToolbar: React.FC<PostMarkdownFormatToolbarProps> = ({
  textareaRef,
  value,
  setValue,
  onRequestWriteMode,
}) => {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const headingWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headingMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = headingWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setHeadingMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [headingMenuOpen]);

  const run = useCallback(
    (fn: () => void) => {
      onRequestWriteMode?.();
      const el = textareaRef.current;
      if (!el) return;
      fn();
    },
    [onRequestWriteMode, textareaRef]
  );

  const setPlain = useCallback(
    (next: string) => {
      setValue(next);
    },
    [setValue]
  );

  return (
    <div
      role="toolbar"
      aria-label="마크다운 서식"
      className="post-markdown-format-toolbar"
    >
      <button
        type="button"
        title="굵게"
        aria-label="굵게"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            wrapSelection(el, value, setPlain, '**', '**', '굵게');
          })
        }
      >
        <Bold size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="기울임"
        aria-label="기울임"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            wrapSelection(el, value, setPlain, '*', '*', '기울임');
          })
        }
      >
        <Italic size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="취소선"
        aria-label="취소선"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            wrapSelection(el, value, setPlain, '~~', '~~', '취소선');
          })
        }
      >
        <Strikethrough size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="서식 제거 (일반 텍스트로)"
        aria-label="마크다운 서식 모두 제거"
        style={btnStyle}
        onClick={() => {
          onRequestWriteMode?.();
          const el = textareaRef.current;
          if (!el || !value.trim()) return;
          if (
            !window.confirm(
              '본문에서 마크다운 서식을 모두 제거하고 일반 텍스트만 남길까요?\n단락은 빈 줄로 구분되며, 목록·표 등은 한 덩어리로 합쳐질 수 있습니다.'
            )
          ) {
            return;
          }
          const plain = stripMarkdownToPlainText(value);
          setValue(plain);
          requestAnimationFrame(() => {
            el.focus();
            const len = plain.length;
            el.setSelectionRange(len, len);
          });
        }}
      >
        <RemoveFormatting size={15} strokeWidth={2.2} />
      </button>
      <div ref={headingWrapRef} style={{ position: 'relative', gridColumn: 'span 2' }}>
        <button
          type="button"
          title="제목 (H1·H2·H3)"
          aria-label="제목 단계 선택"
          aria-expanded={headingMenuOpen}
          aria-haspopup="menu"
          style={{
            ...btnStyle,
            width: '100%',
            gap: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRequestWriteMode?.();
            setHeadingMenuOpen((v) => !v);
          }}
        >
          <Heading size={14} strokeWidth={2.2} />
          <ChevronDown
            size={12}
            strokeWidth={2.5}
            style={{
              opacity: 0.65,
              transform: headingMenuOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.15s ease',
            }}
            aria-hidden
          />
        </button>
        {headingMenuOpen && (
          <div
            role="menu"
            className="post-markdown-heading-menu"
            aria-label="제목 크기"
            style={{
              position: 'absolute',
              left: 0,
              top: 'calc(100% + 4px)',
              minWidth: 120,
              padding: 6,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
              zIndex: 20,
            }}
          >
            {([1, 2, 3] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                role="menuitem"
                style={headingMenuItemStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  run(() => {
                    const el = textareaRef.current!;
                    setHeadingLevel(el, value, setPlain, lv);
                  });
                  setHeadingMenuOpen(false);
                }}
              >
                제목 H{lv} <span style={{ fontWeight: 400, color: '#64748b' }}>({'#'.repeat(lv)} )</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        title="인라인 코드"
        aria-label="인라인 코드"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            wrapSelection(el, value, setPlain, '`', '`', 'code');
          })
        }
      >
        <Code size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="링크 (http/https/mailto)"
        aria-label="링크 삽입"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const selected = value.slice(start, end);
            const labelDefault = selected.trim();
            const label =
              labelDefault ||
              (window.prompt('링크에 표시할 텍스트', '링크') || '').trim();
            if (!label) return;
            let url = window.prompt('주소 (https://, http://, mailto: 만 허용)', 'https://');
            if (url == null) return;
            url = url.trim();
            if (!isAllowedMarkdownHref(url)) {
              window.alert('허용된 형식: https://, http://, mailto: 로 시작하는 주소만 사용할 수 있습니다.');
              return;
            }
            const snippet = `[${label}](${url})`;
            const next = value.slice(0, start) + snippet + value.slice(end);
            setPlain(next);
            const caret = start + snippet.length;
            requestAnimationFrame(() => {
              el.focus();
              el.setSelectionRange(caret, caret);
            });
          })
        }
      >
        <Link size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="글머리 목록"
        aria-label="글머리 목록"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            toggleLinePrefix(el, value, setPlain, '- ');
          })
        }
      >
        <List size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="번호 목록"
        aria-label="번호 목록"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            toggleLinePrefix(el, value, setPlain, '1. ');
          })
        }
      >
        <ListOrdered size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="할 일 목록"
        aria-label="할 일 목록"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            toggleLinePrefix(el, value, setPlain, '- [ ] ');
          })
        }
      >
        <CheckSquare size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="인용"
        aria-label="인용"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            toggleLinePrefix(el, value, setPlain, '> ');
          })
        }
      >
        <Quote size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="구분선"
        aria-label="구분선"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            insertInTextarea(el, value, setPlain, '\n\n---\n\n', {
              start: '\n\n---\n\n'.length,
              end: '\n\n---\n\n'.length,
            });
          })
        }
      >
        <Minus size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="표"
        aria-label="표 템플릿"
        style={btnStyle}
        onClick={() =>
          run(() => {
            const el = textareaRef.current!;
            const block = `\n${TABLE_TEMPLATE}\n`;
            insertInTextarea(el, value, setPlain, block, {
              start: block.length,
              end: block.length,
            });
          })
        }
      >
        <Table size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default PostMarkdownFormatToolbar;
