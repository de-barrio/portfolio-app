"use client";

import { usd, pct } from "@/lib/format";

interface Segment {
  id: string;
  ticker: string;
  pct: number;
  val: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  hovered: string | null;
  onHover: (id: string | null) => void;
  totalValue: number;
}

function arc(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
  if (a1 - a0 >= 359.9) a1 = a0 + 359.9;
  const toXY = (cx: number, cy: number, rad: number, deg: number) => ({
    x: cx + rad * Math.cos((deg - 90) * Math.PI / 180),
    y: cy + rad * Math.sin((deg - 90) * Math.PI / 180),
  });
  const s = toXY(cx, cy, R, a0), e = toXY(cx, cy, R, a1);
  const s2 = toXY(cx, cy, r, a1), e2 = toXY(cx, cy, r, a0);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${R} ${R} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} L${s2.x.toFixed(2)} ${s2.y.toFixed(2)} A${r} ${r} 0 ${lg} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}Z`;
}

export function DonutChart({ segments, hovered, onHover, totalValue }: DonutChartProps) {
  const CX = 110, CY = 110, OR = 88, IR = 56;
  let deg = 0;
  const hoveredSeg = segments.find((s) => s.id === hovered);

  return (
    <div>
      <svg width={220} height={220} className="block mx-auto">
        {segments.map((s) => {
          const sweep = (s.pct / 100) * 360;
          const a0 = deg;
          deg += sweep;
          const isH = hovered === s.id;
          return (
            <path
              key={s.id}
              d={arc(CX, CY, isH ? OR + 5 : OR, isH ? IR - 3 : IR, a0, a0 + sweep)}
              fill={s.color}
              opacity={hovered && !isH ? 0.45 : 1}
              className="cursor-pointer"
              style={{ transition: "all 0.14s ease" }}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
        {/* Center text */}
        {hoveredSeg ? (
          <>
            <text x={CX} y={CY - 8} textAnchor="middle" className="font-sans text-[13px] font-bold" fill={hoveredSeg.color}>
              {hoveredSeg.ticker}
            </text>
            <text x={CX} y={CY + 12} textAnchor="middle" className="font-sans text-[13px]" fill="var(--muted-foreground)">
              {pct(hoveredSeg.pct)}
            </text>
            <text x={CX} y={CY + 28} textAnchor="middle" className="font-sans text-[11px]" fill="var(--muted-foreground)">
              {usd(hoveredSeg.val)}
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 6} textAnchor="middle" className="font-serif text-[12px]" fill="var(--muted-foreground)">
              Market Value
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" className="font-sans text-[15px] font-semibold" fill="var(--foreground)">
              {usd(totalValue)}
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3.5 flex flex-col gap-1.5">
        {segments.map((s) => (
          <div
            key={s.id}
            onMouseEnter={() => onHover(s.id)}
            onMouseLeave={() => onHover(null)}
            className="flex items-center justify-between cursor-default transition-opacity duration-100"
            style={{ opacity: hovered && hovered !== s.id ? 0.35 : 1 }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-[11.5px] font-medium">{s.ticker}</span>
            </div>
            <span className="tabnum text-[11.5px] text-muted-foreground">{pct(s.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
