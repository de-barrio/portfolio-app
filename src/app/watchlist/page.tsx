"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { usd, sign, compactUsd, f2, pct } from "@/lib/format";
import { useAssetSearch } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Plus, Trash2, Eye, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Types ──────────────────────────────────────────────────────

interface WatchlistItem {
  id: string;
  symbol: string;
  name: string | null;
  type: string;
  price: number;
  changePercent: number;
  marketCap: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  note: string | null;
}

interface DailyBar {
  date: string;
  close: number;
}

// ── Range helpers ──────────────────────────────────────────────

type RangeKey = "1M" | "6M" | "YTD" | "1Y" | "5Y";

function rangeToFrom(key: RangeKey): string {
  const now = new Date();
  switch (key) {
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 10);
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().slice(0, 10);
    }
    case "YTD":
      return `${now.getFullYear()}-01-01`;
    case "1Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().slice(0, 10);
    }
    case "5Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      return d.toISOString().slice(0, 10);
    }
  }
}

// ── SVG Chart ──────────────────────────────────────────────────

function MiniChart({
  data,
  sliderStart,
  sliderEnd,
}: {
  data: DailyBar[];
  sliderStart: number;
  sliderEnd: number;
}) {
  const W = 600;
  const H = 160;
  const PAD = { top: 12, right: 12, bottom: 24, left: 50 };

  const sliced = useMemo(() => {
    if (!data.length) return [];
    const startIdx = Math.floor((data.length - 1) * sliderStart);
    const endIdx = Math.ceil((data.length - 1) * sliderEnd);
    return data.slice(startIdx, endIdx + 1);
  }, [data, sliderStart, sliderEnd]);

  if (!sliced.length) {
    return (
      <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
        No price history available
      </div>
    );
  }

  const prices = sliced.map((d) => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const points = sliced
    .map((d, i) => {
      const x = PAD.left + (i / (sliced.length - 1 || 1)) * innerW;
      const y = PAD.top + innerH - ((d.close - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const isPositive = sliced[sliced.length - 1].close >= sliced[0].close;
  const color = isPositive
    ? "var(--warm-green, #1A7A4A)"
    : "var(--warm-red, #B83232)";

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = min + (range * i) / 4;
    const y = PAD.top + innerH - (i / 4) * innerH;
    return { val, y };
  });

  // X-axis labels (first, mid, last)
  const xLabels = [
    { label: sliced[0].date.slice(5), x: PAD.left },
    {
      label: sliced[Math.floor(sliced.length / 2)]?.date.slice(5) ?? "",
      x: PAD.left + innerW / 2,
    },
    { label: sliced[sliced.length - 1].date.slice(5), x: PAD.left + innerW },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            y1={t.y}
            x2={W - PAD.right}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <text
            x={PAD.left - 6}
            y={t.y + 3}
            textAnchor="end"
            fill="currentColor"
            fillOpacity={0.4}
            fontSize={9}
          >
            ${t.val.toFixed(0)}
          </text>
        </g>
      ))}
      {/* X labels */}
      {xLabels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={H - 4}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          fill="currentColor"
          fillOpacity={0.4}
          fontSize={9}
        >
          {l.label}
        </text>
      ))}
      {/* Price line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Expanded Detail Panel ──────────────────────────────────────

function ExpandedPanel({ item }: { item: WatchlistItem }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("1Y");
  const [sliderStart, setSliderStart] = useState(0);
  const [sliderEnd, setSliderEnd] = useState(1);

  const from = rangeToFrom(rangeKey);
  const to = new Date().toISOString().slice(0, 10);

  const { data: chartData } = useSWR<DailyBar[]>(
    `/api/assets/${item.symbol}/history?from=${from}&to=${to}`,
    fetcher
  );

  const ranges: RangeKey[] = ["1M", "6M", "YTD", "1Y", "5Y"];

  const handleRangeChange = useCallback((key: RangeKey) => {
    setRangeKey(key);
    setSliderStart(0);
    setSliderEnd(1);
  }, []);

  return (
    <div className="px-4 py-4 bg-accent/50 space-y-4">
      {/* Chart */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                rangeKey === r
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {chartData ? (
          <>
            <MiniChart
              data={chartData}
              sliderStart={sliderStart}
              sliderEnd={sliderEnd}
            />
            {/* Range slider */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-muted-foreground w-8">From</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sliderStart}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v < sliderEnd - 0.02) setSliderStart(v);
                }}
                className="flex-1 h-1 accent-foreground"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sliderEnd}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > sliderStart + 0.02) setSliderEnd(v);
                }}
                className="flex-1 h-1 accent-foreground"
              />
              <span className="text-[9px] text-muted-foreground w-4">To</span>
            </div>
          </>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded" />
          </div>
        )}
      </div>

      {/* Key Stats */}
      <div>
        <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Key Stats
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <StatCell label="Mkt Cap" value={compactUsd(item.marketCap)} />
          <StatCell label="P/E Ratio" value={f2(item.trailingPE)} />
          <StatCell
            label="Dividend"
            value={item.dividendYield != null ? pct(item.dividendYield) : "\u2014"}
          />
          <StatCell label="52-wk High" value={usd(item.fiftyTwoWeekHigh)} />
          <StatCell label="52-wk Low" value={usd(item.fiftyTwoWeekLow)} />
        </div>
      </div>
    </div>
  );
}

// ── Stat Cell ──────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabnum">{value}</p>
    </div>
  );
}

// ── Column count constant ──────────────────────────────────────

const COL_COUNT = 8; // Ticker, Name, Type, Price, Day Change, Note, Delete, Chevron

// ── Main Page ──────────────────────────────────────────────────

export default function WatchlistPage() {
  const { data: items, isLoading, mutate } = useSWR("/api/watchlist", fetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { results: searchResults } = useAssetSearch(searchQuery);

  async function addToWatchlist(symbol: string, name: string, type: string) {
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name, type }),
      });
      if (res.status === 409) {
        toast.error("Already in watchlist");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success(`${symbol} added to watchlist`);
      setShowAdd(false);
      setSearchQuery("");
      mutate();
    } catch {
      toast.error("Failed to add");
    }
  }

  async function removeItem(id: string) {
    try {
      await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      toast.success("Removed from watchlist");
      if (expandedId === id) setExpandedId(null);
      mutate();
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function updateNote(id: string, note: string) {
    try {
      await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      mutate();
    } catch {
      // Silent fail for note updates
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track assets you&apos;re interested in
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add to Watchlist
        </Button>
      </div>

      {isLoading ? (
        <Card className="overflow-hidden">
          <div className="bg-accent px-3.5 py-2 border-b border-border">
            <Skeleton className="h-3 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="px-3.5 py-3 border-b border-border flex items-center gap-4"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10 ml-auto" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </Card>
      ) : !items?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              Your watchlist is empty.
            </p>
            <Button onClick={() => setShowAdd(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent">
                {[
                  "",
                  "Ticker",
                  "Name",
                  "Type",
                  "Price",
                  "Day Change",
                  "Note",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-3.5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] border-b border-border whitespace-nowrap"
                    style={{
                      textAlign:
                        i === 1 || i === 2 || i === 6 ? "left" : "right",
                      width: i === 0 ? "28px" : i === 7 ? "36px" : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(items as WatchlistItem[]).map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <TableRowGroup
                    key={item.id}
                    item={item}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(item.id)}
                    onRemove={() => removeItem(item.id)}
                    onUpdateNote={(note) => updateNote(item.id, note)}
                  />
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Add to Watchlist
            </DialogTitle>
          </DialogHeader>
          <Command className="border rounded-lg">
            <CommandInput
              placeholder="Search ticker or company..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {searchResults.map(
                (r: { symbol: string; name: string; type: string }) => (
                  <CommandItem
                    key={r.symbol}
                    value={r.symbol}
                    onSelect={() => addToWatchlist(r.symbol, r.name, r.type)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-bold text-xs tracking-wide">
                          {r.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {r.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {r.type}
                      </Badge>
                    </div>
                  </CommandItem>
                )
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Table Row Group (data row + optional expanded panel) ───────

function TableRowGroup({
  item,
  isExpanded,
  onToggle,
  onRemove,
  onUpdateNote,
}: {
  item: WatchlistItem;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateNote: (note: string) => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-[var(--warm-border-light,#EDE9E2)] cursor-pointer transition-colors ${
          isExpanded ? "bg-accent/50" : "hover:bg-accent"
        }`}
        onClick={onToggle}
      >
        <td className="px-2 py-2.5 w-[28px]">
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </td>
        <td className="px-3.5 py-2.5">
          <span className="font-bold text-[12.5px] tracking-[0.04em]">
            {item.symbol}
          </span>
        </td>
        <td className="px-3.5 py-2.5 text-sm text-muted-foreground truncate max-w-[200px]">
          {item.name}
        </td>
        <td className="px-3.5 py-2.5 text-right">
          <Badge variant="outline" className="text-[9px]">
            {item.type}
          </Badge>
        </td>
        <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-medium">
          {usd(item.price)}
        </td>
        <td
          className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-medium"
          style={{
            color:
              item.changePercent >= 0
                ? "var(--warm-green, #1A7A4A)"
                : "var(--warm-red, #B83232)",
          }}
        >
          {sign(item.changePercent)}
        </td>
        <td className="px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
          <Input
            defaultValue={item.note ?? ""}
            placeholder="Add note..."
            className="h-7 text-xs border-none bg-transparent"
            onBlur={(e) => onUpdateNote(e.target.value)}
          />
        </td>
        <td
          className="px-2.5 py-2.5 w-[36px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={COL_COUNT} className="p-0 border-b border-border">
            <ExpandedPanel item={item} />
          </td>
        </tr>
      )}
    </>
  );
}
