import React, { useMemo } from 'react';
import type { TechScoreDto } from '../../types/user';

const DEFAULT_MAX = 100;

function polar(cx: number, cy: number, radius: number, angleRad: number) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

export interface TechRadarChartProps {
  scores: TechScoreDto[];
  maxScore?: number;
  size?: number;
}

type RadarGeom = {
  pathD: string;
  dots: { x: number; y: number; key: string }[];
  labels: React.ReactNode;
  grid: React.ReactNode;
  count: number;
};

function buildRadarGeom(scores: TechScoreDto[], maxScore: number, size: number): RadarGeom {
  const list = scores.filter((s) => s.techName && Number.isFinite(s.score));
  const count = list.length;
  if (count === 0) {
    return { pathD: '', dots: [], labels: null, grid: null, count: 0 };
  }

  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.32;
  const labelR = size * 0.4;

  const angleForIndex = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / count;

  const rings = [0.25, 0.5, 0.75, 1].map((t) => (
    <circle
      key={t}
      cx={cx}
      cy={cy}
      r={rMax * t}
      fill="none"
      stroke="#dbdbdb"
      strokeWidth={0.6}
      strokeDasharray={t < 1 ? '4 4' : '0'}
    />
  ));

  const spokes = list.map((_, i) => {
    const a = angleForIndex(i);
    const outer = polar(cx, cy, rMax, a);
    return (
      <line
        key={`spoke-${i}`}
        x1={cx}
        y1={cy}
        x2={outer.x}
        y2={outer.y}
        stroke="#efefef"
        strokeWidth={1}
      />
    );
  });

  const points: { x: number; y: number }[] = [];
  const dots: { x: number; y: number; key: string }[] = [];

  for (let i = 0; i < count; i++) {
    const norm = Math.min(Math.max(list[i].score / maxScore, 0), 1);
    const a = angleForIndex(i);
    const p = polar(cx, cy, rMax * norm, a);
    points.push(p);
    dots.push({ x: p.x, y: p.y, key: `${list[i].techName}-${i}` });
  }

  const pathD =
    points.length > 0
      ? `M ${points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`
      : '';

  const labels = list.map((item, i) => {
    const a = angleForIndex(i);
    const p = polar(cx, cy, labelR, a);
    const short = item.techName.length > 10 ? `${item.techName.slice(0, 9)}…` : item.techName;
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    const deg = ((a * 180) / Math.PI + 360) % 360;
    if (deg > 20 && deg < 160) anchor = 'start';
    else if (deg > 200 && deg < 340) anchor = 'end';
    return (
      <text
        key={`lbl-${item.techName}-${i}`}
        x={p.x}
        y={p.y}
        textAnchor={anchor}
        dominantBaseline="middle"
        style={{
          fontSize: 11,
          fill: '#262626',
          fontWeight: 600,
        }}
      >
        {short}
      </text>
    );
  });

  return {
    pathD,
    dots,
    labels,
    grid: (
      <>
        {rings}
        {spokes}
      </>
    ),
    count,
  };
}

/**
 * 기술별 점수를 방사형(레이더) 차트로 표시합니다.
 */
const TechRadarChart: React.FC<TechRadarChartProps> = ({
  scores,
  maxScore = DEFAULT_MAX,
  size = 320,
}) => {
  const { pathD, dots, labels, grid, count } = useMemo(
    () => buildRadarGeom(scores, maxScore, size),
    [scores, maxScore, size]
  );

  if (count === 0) return null;

  const list = scores.filter((s) => s.techName && Number.isFinite(s.score));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: 360, aspectRatio: '1' }}
        role="img"
        aria-label="기술 스택 숙련도 방사형 차트"
      >
        {grid}
        {pathD ? (
          <path
            d={pathD}
            fill="rgba(0, 149, 246, 0.22)"
            stroke="#0095f6"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : null}
        {dots.map((d) => (
          <circle
            key={d.key}
            cx={d.x}
            cy={d.y}
            r={4}
            fill="#0095f6"
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
        {labels}
      </svg>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '16px 0 0',
          width: '100%',
          maxWidth: 360,
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}
      >
        {list.map((item, idx) => (
          <li
            key={`${item.techName}-${idx}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: '#262626',
              padding: '6px 10px',
              backgroundColor: '#fafafa',
              borderRadius: 8,
              border: '1px solid #efefef',
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.techName}</span>
            <span style={{ color: '#0095f6', fontWeight: 700 }}>{item.score} pt</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TechRadarChart;
