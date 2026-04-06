import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

/** 요약 패널과 그래프를 한 줄에 둘 때만 높이를 맞춤 */
const SYNC_HEIGHT_MQ = '(min-width: 640px)';
import type { TechScoreDto } from '../../types/user';

const SLICE_COLORS = [
  '#0095f6',
  '#E1306C',
  '#F77737',
  '#833AB4',
  '#FCAF45',
  '#5851DB',
  '#0D9488',
  '#EA580C',
  '#2563eb',
  '#db2777',
  '#ca8a04',
  '#7c3aed',
];

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** 바깥·안쪽 호로 도넛 조각 하나 */
function annulusSector(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startRad: number,
  endRad: number
): string {
  const p1 = polar(cx, cy, rOuter, startRad);
  const p2 = polar(cx, cy, rOuter, endRad);
  const p3 = polar(cx, cy, rInner, endRad);
  const p4 = polar(cx, cy, rInner, startRad);
  const sweep = endRad - startRad;
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export interface TechDonutChartProps {
  scores: TechScoreDto[];
  size?: number;
}

type Slice = {
  techName: string;
  score: number;
  percentage: number;
  path: string;
  color: string;
  midAngleRad: number;
  labelRadius: number;
  showLabel: boolean;
};

const LABEL_MIN_SWEEP_RAD = 0.12;
const LABEL_MIN_PCT = 4;

function shortTechChartLabel(name: string, maxChars: number): string {
  const t = name.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

function buildSlices(scores: TechScoreDto[], size: number): Slice[] {
  const list = scores.filter((s) => s.techName && Number.isFinite(s.score));
  if (list.length === 0) return [];

  const hasBackendPct = list.every(
    (s) => typeof s.percentage === 'number' && Number.isFinite(s.percentage) && s.percentage >= 0
  );

  let percentages: number[];
  if (hasBackendPct) {
    percentages = list.map((s) => Math.max(0, s.percentage as number));
    const sum = percentages.reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 100) > 0.05) {
      percentages = percentages.map((p) => (p / sum) * 100);
    }
  } else {
    const total = list.reduce((acc, s) => acc + Math.max(0, s.score), 0);
    percentages =
      total > 0
        ? list.map((s) => (Math.max(0, s.score) / total) * 100)
        : list.map(() => 100 / list.length);
  }

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.38;
  const rInner = size * 0.22;

  let angle = -Math.PI / 2;
  const twoPi = Math.PI * 2;

  /** 도넛 바깥쪽으로 나가는 라벨 기준 반경(조각 중심각 방향) */
  const labelRadius = rOuter + size * 0.055;

  return list.map((s, i) => {
    const pct = percentages[i] ?? 0;
    let sweep = (pct / 100) * twoPi;
    if (sweep > twoPi - 1e-4) sweep = twoPi - 1e-4;
    const startA = angle;
    const end = angle + sweep;
    const path = pct <= 0 || sweep <= 0 ? '' : annulusSector(cx, cy, rOuter, rInner, startA, end);
    const midAngleRad = (startA + end) / 2;
    const showLabel = sweep >= LABEL_MIN_SWEEP_RAD && pct >= LABEL_MIN_PCT;
    angle = end;
    return {
      techName: s.techName,
      score: s.score,
      percentage: Math.round(pct * 10) / 10,
      path,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      midAngleRad,
      labelRadius,
      showLabel,
    };
  });
}

/**
 * 기술별 비중(백엔드 percentage 우선)을 도넛 차트로 표시하고, 왼쪽에 작은 요약 패널을 둡니다.
 */
const TechDonutChart: React.FC<TechDonutChartProps> = ({ scores, size = 480 }) => {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [chartBlockHeight, setChartBlockHeight] = useState<number | null>(null);
  const [sideBySide, setSideBySide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SYNC_HEIGHT_MQ).matches
  );

  const slices = useMemo(() => buildSlices(scores, size), [scores, size]);

  useLayoutEffect(() => {
    const mq = window.matchMedia(SYNC_HEIGHT_MQ);
    const onMq = () => setSideBySide(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  useLayoutEffect(() => {
    if (!sideBySide) {
      setChartBlockHeight(null);
      return;
    }
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      setChartBlockHeight((prev) => (Math.abs((prev ?? 0) - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    setChartBlockHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [sideBySide, size, slices.length]);

  if (slices.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  /** 도넛 바깥 라벨 글자 크기 */
  const nameFontPx = Math.max(11, Math.round(size * 0.03));
  const pctFontPx = Math.max(10, Math.round(size * 0.026));
  const maxNameChars = size >= 420 ? 11 : 9;
  /** 라벨이 잘리지 않도록 viewBox 여백 */
  const vbPad = size * 0.15;
  const vbSize = size + 2 * vbPad;

  const summaryGridCols = 'minmax(0, 1fr) minmax(44px, auto) minmax(40px, auto)';

  const rowHeightLocked =
    sideBySide && chartBlockHeight != null && chartBlockHeight > 0;

  const hoveredSlice =
    hoverKey == null
      ? null
      : (slices.find((sl, idx) => sl.path && `${sl.techName}-${idx}` === hoverKey) ?? null);

  const centerNameFont = Math.max(14, Math.round(size * 0.038));
  const centerScoreFont = Math.max(22, Math.round(size * 0.078));
  const centerMaxNameChars = size >= 420 ? 14 : 11;
  /** 이름·점수 세로 간격(겹침 방지) — 글자 높이에 비례 */
  const centerLineGap = Math.max(16, Math.round(size * 0.036));
  const nameLineY = cy - (centerScoreFont * 0.52 + centerLineGap * 0.5);
  const scoreLineY = cy + (centerNameFont * 0.52 + centerLineGap * 0.5);

  return (
    <div
      style={
        rowHeightLocked
          ? {
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'stretch',
              gap: '14px 20px',
              height: chartBlockHeight!,
              overflow: 'hidden',
            }
          : {
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: '14px 20px',
            }
      }
    >
      <div
        style={{
          flex: '0 1 220px',
          width: '100%',
          maxWidth: 240,
          border: '1px solid #efefef',
          borderRadius: 8,
          backgroundColor: '#fafafa',
          overflow: 'hidden',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(rowHeightLocked ? { height: '100%', alignSelf: 'stretch' } : { alignSelf: 'flex-start' }),
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            borderBottom: '1px solid #efefef',
            backgroundColor: '#fff',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#8e8e8e',
              letterSpacing: '0.02em',
              marginBottom: 6,
            }}
          >
            기술별 비중·점수
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: summaryGridCols,
              gap: '4px 6px',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: '#8e8e8e',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            <span>기술</span>
            <span style={{ textAlign: 'right' }}>비중</span>
            <span style={{ textAlign: 'right' }}>점수</span>
          </div>
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            width: '100%',
            flex: rowHeightLocked ? 1 : undefined,
            minHeight: 0,
            maxHeight: rowHeightLocked ? undefined : 'min(52vh, 320px)',
            overflowY: 'auto',
          }}
        >
          {slices.map((sl, idx) => (
            <li
              key={`score-${sl.techName}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: summaryGridCols,
                alignItems: 'center',
                gap: '4px 6px',
                fontSize: '0.72rem',
                color: '#262626',
                padding: '6px 10px',
                borderBottom: idx < slices.length - 1 ? '1px solid #efefef' : 'none',
                backgroundColor: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    backgroundColor: sl.color,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sl.techName}
                </span>
              </div>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  color: '#262626',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {sl.percentage}%
              </span>
              <span style={{ color: '#0095f6', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {sl.score}점
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={chartWrapRef}
        style={{
          flex: '1 1 300px',
          minWidth: 0,
          maxWidth: 540,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(rowHeightLocked
            ? { height: '100%', alignSelf: 'stretch' }
            : { alignSelf: 'flex-start' }),
        }}
      >
        <svg
          width="100%"
          viewBox={`${-vbPad} ${-vbPad} ${vbSize} ${vbSize}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            maxWidth: '100%',
            maxHeight: rowHeightLocked ? '100%' : undefined,
            aspectRatio: '1',
            display: 'block',
          }}
          role="img"
          aria-label="기술 스택 비중 도넛 차트"
        >
          {slices.map((sl, idx) =>
            sl.path ? (
              <path
                key={`${sl.techName}-${idx}`}
                d={sl.path}
                fill={sl.color}
                stroke="#fff"
                strokeWidth={hoverKey === `${sl.techName}-${idx}` ? 2 : 1}
                opacity={hoverKey && hoverKey !== `${sl.techName}-${idx}` ? 0.55 : 1}
                style={{ transition: 'opacity 0.15s ease', cursor: 'default' }}
                onMouseEnter={() => setHoverKey(`${sl.techName}-${idx}`)}
                onMouseLeave={() => setHoverKey(null)}
              >
                <title>{`${sl.techName}: ${sl.percentage}%, ${sl.score}점`}</title>
              </path>
            ) : null
          )}
          {hoveredSlice ? (
            <g pointerEvents="none" style={{ userSelect: 'none' }}>
              <text
                x={cx}
                y={nameLineY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={hoveredSlice.color}
                stroke="#fff"
                strokeWidth={Math.max(0.65, size * 0.0025)}
                paintOrder="stroke fill"
                style={{
                  fontSize: centerNameFont,
                  fontWeight: 700,
                }}
              >
                {shortTechChartLabel(hoveredSlice.techName, centerMaxNameChars)}
              </text>
              <text
                x={cx}
                y={scoreLineY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={hoveredSlice.color}
                stroke="#fff"
                strokeWidth={Math.max(0.8, size * 0.003)}
                paintOrder="stroke fill"
                style={{
                  fontSize: centerScoreFont,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {hoveredSlice.score}점
              </text>
            </g>
          ) : null}
          {slices.map((sl, idx) => {
            if (!sl.path || !sl.showLabel) return null;
            const p = polar(cx, cy, sl.labelRadius, sl.midAngleRad);
            const shortName = shortTechChartLabel(sl.techName, maxNameChars);
            const cosA = Math.cos(sl.midAngleRad);
            const textAnchor: 'start' | 'middle' | 'end' =
              cosA > 0.12 ? 'start' : cosA < -0.12 ? 'end' : 'middle';
            const lineGap = nameFontPx * 0.12;
            const halo = Math.max(0.75, size * 0.0026);
            return (
              <g
                key={`lbl-${sl.techName}-${idx}`}
                transform={`translate(${p.x},${p.y})`}
                pointerEvents="none"
                style={{ userSelect: 'none' }}
              >
                <text
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  y={-(pctFontPx / 2 + lineGap / 2)}
                  fill={sl.color}
                  stroke="#fff"
                  strokeWidth={halo}
                  paintOrder="stroke fill"
                  style={{
                    fontSize: nameFontPx,
                    fontWeight: 700,
                  }}
                >
                  {shortName}
                </text>
                <text
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  y={nameFontPx / 2 + lineGap / 2}
                  fill={sl.color}
                  stroke="#fff"
                  strokeWidth={halo}
                  paintOrder="stroke fill"
                  style={{
                    fontSize: pctFontPx,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {sl.percentage}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default TechDonutChart;
