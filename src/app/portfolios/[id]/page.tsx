"use client";

import { useState, useEffect, useMemo, useCallback, use } from "react";
import Link from "next/link";
import { useDraft, usePortfolio, useAssetSearch } from "@/lib/hooks";
import { usd, pct, sign, signUsd, f1 } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";
import { DonutChart } from "@/components/portfolio/donut-chart";
import { StatCard } from "@/components/portfolio/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  History,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Position {
  id: string;
  assetId: string;
  symbol: string;
  name: string | null;
  type: string;
  shares: number;
  targetPct: number | null;
  sortOrder: number;
  price: number;
  priceLabel: string;
  value: number;
  change: number | null;
  changePercent: number | null;
  baselinePrice: number | null;
}

export default function PortfolioWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { portfolio, isLoading: loadingPortfolio } = usePortfolio(id);
  const { draft, isLoading: loadingDraft, mutate: mutateDraft } = useDraft(id);

  const [positions, setPositions] = useState<Position[]>([]);
  const [baseCapital, setBaseCapital] = useState(100000);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Init positions from draft
  useEffect(() => {
    if (draft?.positions) {
      setPositions(draft.positions);
      setBaseCapital(draft.baseCapital ?? 100000);
    }
  }, [draft]);

  // Derived values
  const totalValue = useMemo(
    () => positions.reduce((sum, p) => sum + p.value, 0),
    [positions]
  );

  const enriched = useMemo(
    () =>
      positions.map((p, i) => {
        const currentPct = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
        const drift = p.targetPct != null ? currentPct - p.targetPct : null;
        return {
          ...p,
          currentPct,
          drift,
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      }),
    [positions, totalValue]
  );

  const sumTarget = enriched.reduce((s, p) => s + (p.targetPct ?? 0), 0);
  const cashVal = baseCapital - totalValue;
  const cashPct = baseCapital > 0 ? (cashVal / baseCapital) * 100 : 0;
  const isOverAllocated = cashVal < 0;
  const overAmount = isOverAllocated ? Math.abs(cashVal) : 0;
  const overPct = baseCapital > 0 ? (overAmount / baseCapital) * 100 : 0;
  const isSevereOver = overPct > 10;
  const allocatedPct = baseCapital > 0 ? Math.min((totalValue / baseCapital) * 100, 100) : 0;
  const allocatedPctRaw = baseCapital > 0 ? (totalValue / baseCapital) * 100 : 0;

  // Day change & baseline totals from draft API
  const totalDayChange: number | null = draft?.totalDayChange ?? null;
  const totalDayChangePct: number | null = draft?.totalDayChangePct ?? null;
  const baselineTotal: number | null = draft?.baselineTotal ?? null;
  const latestVersionNumber: number | null = draft?.latestVersionNumber ?? null;
  const sinceSaveGain = baselineTotal != null ? totalValue - baselineTotal : null;
  const sinceSavePct = baselineTotal != null && baselineTotal > 0 ? ((totalValue - baselineTotal) / baselineTotal) * 100 : null;

  // Donut segments
  const donutSegs = useMemo(() => {
    const s = enriched
      .filter((p) => p.value > 0)
      .map((p) => ({
        id: p.id,
        ticker: p.symbol,
        pct: p.currentPct,
        val: p.value,
        color: p.color,
      }));
    if (cashVal > 0 && cashPct > 0.5)
      s.push({
        id: "__cash",
        ticker: "Cash",
        pct: cashPct,
        val: cashVal,
        color: "#D6D0C4",
      });
    return s;
  }, [enriched, cashPct, cashVal]);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (!id || positions.length === 0) return;
    try {
      await fetch(`/api/portfolios/${id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCapital,
          positions: positions.map((p) => ({
            symbol: p.symbol,
            name: p.name,
            type: p.type,
            shares: p.shares,
            targetPct: p.targetPct,
          })),
        }),
      });
      setIsDirty(false);
    } catch {
      // Silent fail for auto-save
    }
  }, [id, positions, baseCapital]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(saveDraft, 800);
    return () => clearTimeout(timer);
  }, [isDirty, saveDraft]);

  // Cmd+S to open save version dialog
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (positions.length > 0) setShowSaveDialog(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [positions.length]);

  // Position operations
  function updateShares(posId: string, shares: number) {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== posId) return p;
        return { ...p, shares, value: shares * p.price };
      })
    );
    setIsDirty(true);
  }

  function updateTarget(posId: string, targetPct: number | null) {
    setPositions((prev) =>
      prev.map((p) => (p.id === posId ? { ...p, targetPct } : p))
    );
    setIsDirty(true);
  }

  function removePosition(posId: string) {
    setPositions((prev) => prev.filter((p) => p.id !== posId));
    setIsDirty(true);
  }

  // Asset search for adding positions
  const { results: searchResults } = useAssetSearch(searchQuery);

  async function addPosition(symbol: string, name: string, type: string) {
    // Fetch price
    const res = await fetch(`/api/assets/${symbol}`);
    if (!res.ok) {
      toast.error(`Could not find price for ${symbol}`);
      return;
    }
    const quote = await res.json();

    const newPos: Position = {
      id: `new-${Date.now()}`,
      assetId: "",
      symbol: quote.symbol,
      name: name || quote.name || symbol,
      type: type || quote.type || "Stock",
      shares: 0,
      targetPct: null,
      sortOrder: positions.length,
      price: quote.price,
      priceLabel: quote.priceLabel,
      value: 0,
      change: quote.change ?? null,
      changePercent: quote.changePercent ?? null,
      baselinePrice: null,
    };

    setPositions((prev) => [...prev, newPos]);
    setShowAddSearch(false);
    setSearchQuery("");
    setIsDirty(true);
  }

  // Save version
  async function handleSaveVersion() {
    setSaving(true);
    try {
      await saveDraft(); // Save draft first
      const res = await fetch(`/api/portfolios/${id}/save-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: saveLabel.trim() || undefined,
          notes: saveNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save version");
      toast.success("Version saved");
      setShowSaveDialog(false);
      setSaveLabel("");
      setSaveNotes("");
      mutateDraft();
    } catch {
      toast.error("Failed to save version");
    } finally {
      setSaving(false);
    }
  }

  if (loadingPortfolio || loadingDraft) {
    return (
      <div className="p-7">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-6 gap-3 mb-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-7">
        <p className="text-muted-foreground">Portfolio not found.</p>
        <Link href="/" className="text-sm underline mt-2 inline-block">
          Back to portfolios
        </Link>
      </div>
    );
  }

  return (
    <div className="p-7 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-xl font-semibold">
              {portfolio.name}
            </h1>
            {portfolio.intentTag && (
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {portfolio.intentTag}
              </Badge>
            )}
          </div>
          {isDirty && (
            <Badge variant="outline" className="text-[10px] text-warm-amber">
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/portfolios/${id}/versions`}>
            <Button variant="outline" size="sm">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Versions
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={positions.length === 0}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Version
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <StatCard label="Market Value" value={usd(totalValue)} />
        <StatCard
          label="Cash / Unallocated"
          value={usd(cashVal)}
          sub={isOverAllocated ? "Over-allocated" : `${pct(cashPct)} of account`}
          color={isOverAllocated ? (isSevereOver ? "var(--warm-red, #B83232)" : "var(--warm-amber, #A8690C)") : undefined}
        />
        <StatCard
          label="Day's Change"
          value={signUsd(totalDayChange)}
          sub={totalDayChangePct != null ? sign(totalDayChangePct) : undefined}
          color={
            totalDayChange != null && totalDayChange !== 0
              ? totalDayChange > 0
                ? "var(--warm-green, #1A7A4A)"
                : "var(--warm-red, #B83232)"
              : undefined
          }
        />
        <StatCard
          label="Since Save"
          value={sinceSaveGain != null ? signUsd(sinceSaveGain) : "---"}
          sub={
            sinceSavePct != null && latestVersionNumber != null
              ? `${sign(sinceSavePct)} · v${latestVersionNumber}`
              : "No saved version"
          }
          color={
            sinceSaveGain != null && sinceSaveGain !== 0
              ? sinceSaveGain > 0
                ? "var(--warm-green, #1A7A4A)"
                : "var(--warm-red, #B83232)"
              : undefined
          }
        />
        <StatCard
          label="Positions"
          value={String(positions.filter((p) => p.shares > 0).length)}
        />
        <StatCard
          label="Target Coverage"
          value={sumTarget > 0 ? pct(sumTarget) : "—"}
          color={
            sumTarget > 0 && Math.abs(sumTarget - 100) > 2
              ? "var(--warm-amber, #A8690C)"
              : undefined
          }
          sub={
            sumTarget > 0 && Math.abs(sumTarget - 100) > 2
              ? `${f1(Math.abs(sumTarget - 100))}% from 100%`
              : undefined
          }
        />
      </div>

      {/* Over-allocation warning banner */}
      {isOverAllocated && (
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            borderColor: isSevereOver ? "var(--warm-red, #B83232)" : "var(--warm-amber, #A8690C)",
            background: isSevereOver ? "rgba(184,50,50,0.06)" : "rgba(168,105,12,0.06)",
            color: isSevereOver ? "var(--warm-red, #B83232)" : "var(--warm-amber, #A8690C)",
          }}
        >
          Over-allocated by {usd(overAmount)} ({f1(overPct)}% above {usd(baseCapital)})
        </div>
      )}

      {/* Two-column: table + chart */}
      <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">
        {/* Positions table */}
        <Card className="overflow-hidden">
          <div className="px-[18px] py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-serif text-[15px] font-semibold">Positions</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddSearch(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Position
            </Button>
          </div>

          {/* Sticky available-cash bar */}
          {positions.length > 0 && (
            <div className="sticky top-0 z-10 bg-card border-b border-border px-[18px] py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(allocatedPctRaw, 100)}%`,
                        background: isOverAllocated
                          ? "var(--warm-red, #B83232)"
                          : allocatedPct >= 90
                            ? "var(--warm-amber, #A8690C)"
                            : "var(--warm-green, #1A7A4A)",
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs tabnum text-muted-foreground whitespace-nowrap">
                  {usd(Math.max(0, cashVal))} of {usd(baseCapital)}
                </span>
                {isOverAllocated && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-red-400 text-red-600"
                  >
                    OVER
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-accent">
                  {[
                    "Ticker",
                    "Shares",
                    "Price",
                    "Day Chg",
                    "Value",
                    "Since Save",
                    "Weight",
                    "Target %",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-3.5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] border-b border-border whitespace-nowrap"
                      style={{ textAlign: i === 0 ? "left" : "right" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map((pos) => {
                  const isH = hovered === pos.id;
                  const driftColor =
                    pos.drift == null
                      ? undefined
                      : Math.abs(pos.drift) <= 1
                        ? "var(--warm-green, #1A7A4A)"
                        : Math.abs(pos.drift) <= 3
                          ? "var(--warm-amber, #A8690C)"
                          : "var(--warm-red, #B83232)";
                  return (
                    <tr
                      key={pos.id}
                      onMouseEnter={() => setHovered(pos.id)}
                      onMouseLeave={() => setHovered(null)}
                      className="border-b border-[var(--warm-border-light,#EDE9E2)] transition-colors duration-100"
                      style={{
                        background: isH
                          ? "var(--accent)"
                          : "var(--card)",
                      }}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-[7px] h-[7px] rounded-full shrink-0"
                            style={{ background: pos.color }}
                          />
                          <span className="font-bold text-[12.5px] tracking-[0.04em]">
                            {pos.symbol}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                          >
                            {pos.priceLabel}
                          </Badge>
                        </div>
                        {pos.name && (
                          <div className="text-[10px] text-muted-foreground ml-[15px] truncate max-w-[150px]">
                            {pos.name}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Input
                          type="number"
                          value={pos.shares || ""}
                          onChange={(e) =>
                            updateShares(
                              pos.id,
                              Math.floor(parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-16 text-right tabnum border-none bg-transparent h-auto p-0 text-[13px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] text-muted-foreground">
                        {usd(pos.price)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px]">
                        {pos.change != null ? (
                          <div
                            style={{
                              color:
                                pos.change > 0
                                  ? "var(--warm-green, #1A7A4A)"
                                  : pos.change < 0
                                    ? "var(--warm-red, #B83232)"
                                    : undefined,
                            }}
                          >
                            <div>{signUsd(pos.change)}</div>
                            {pos.changePercent != null && (
                              <div className="text-[10px] opacity-70">
                                {sign(pos.changePercent)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-semibold">
                        {usd(pos.value)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px]">
                        {pos.baselinePrice != null ? (() => {
                          const gain = (pos.price - pos.baselinePrice) * pos.shares;
                          const gainPct = pos.baselinePrice > 0
                            ? ((pos.price - pos.baselinePrice) / pos.baselinePrice) * 100
                            : 0;
                          return (
                            <div
                              style={{
                                color:
                                  gain > 0
                                    ? "var(--warm-green, #1A7A4A)"
                                    : gain < 0
                                      ? "var(--warm-red, #B83232)"
                                      : undefined,
                              }}
                            >
                              <div>{signUsd(gain)}</div>
                              <div className="text-[10px] opacity-70">
                                {sign(gainPct)}
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </td>
                      <td
                        className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-medium"
                        style={{ color: driftColor }}
                      >
                        {pct(pos.currentPct)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={pos.targetPct ?? ""}
                            onChange={(e) =>
                              updateTarget(
                                pos.id,
                                e.target.value !== ""
                                  ? parseFloat(e.target.value)
                                  : null
                              )
                            }
                            className="w-10 text-right tabnum border-none bg-transparent h-auto p-0 text-[12.5px] text-muted-foreground"
                            placeholder="—"
                          />
                          {pos.targetPct != null && (
                            <span className="text-[11px] text-muted-foreground">
                              %
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <button
                          onClick={() => removePosition(pos.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {positions.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3.5 py-8 text-center text-sm text-muted-foreground"
                    >
                      No positions yet. Click &quot;Add Position&quot; to get
                      started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          {positions.length > 0 && (
            <div className="border-t border-border bg-accent px-3.5 py-2.5 flex justify-end">
              <div className="flex items-center gap-0">
                <span className="text-[11px] font-semibold text-muted-foreground mr-auto pr-6">
                  TOTAL
                </span>
                <span
                  className="tabnum text-[12px] w-[80px] text-right"
                  style={{
                    color:
                      totalDayChange != null && totalDayChange !== 0
                        ? totalDayChange > 0
                          ? "var(--warm-green, #1A7A4A)"
                          : "var(--warm-red, #B83232)"
                        : undefined,
                  }}
                >
                  {signUsd(totalDayChange)}
                </span>
                <span className="tabnum text-[13px] font-bold w-[100px] text-right">
                  {usd(totalValue)}
                </span>
                <span
                  className="tabnum text-[12px] w-[80px] text-right"
                  style={{
                    color:
                      sinceSaveGain != null && sinceSaveGain !== 0
                        ? sinceSaveGain > 0
                          ? "var(--warm-green, #1A7A4A)"
                          : "var(--warm-red, #B83232)"
                        : undefined,
                  }}
                >
                  {sinceSaveGain != null ? signUsd(sinceSaveGain) : "---"}
                </span>
                <span className="tabnum text-[12px] text-muted-foreground w-[72px] text-right">
                  100%
                </span>
                <span
                  className="tabnum text-[12px] w-[60px] text-right"
                  style={{
                    color:
                      sumTarget > 0 && Math.abs(sumTarget - 100) > 2
                        ? "var(--warm-amber, #A8690C)"
                        : "var(--warm-green, #1A7A4A)",
                  }}
                >
                  {sumTarget > 0 ? pct(sumTarget) : ""}
                </span>
                <span className="w-[37px]" />
              </div>
            </div>
          )}
        </Card>

        {/* Donut chart */}
        <Card className="p-4">
          <h2 className="font-serif text-[15px] font-semibold mb-3.5">
            Allocation
          </h2>
          {totalValue > 0 ? (
            <DonutChart
              segments={donutSegs}
              hovered={hovered}
              onHover={setHovered}
              totalValue={totalValue}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">
              Add positions to see chart
            </div>
          )}
        </Card>
      </div>

      {/* Target vs Actual panel */}
      {enriched.some((p) => p.targetPct != null && p.value > 0) && (
        <Card className="p-5 mb-4">
          <h2 className="font-serif text-[15px] font-semibold mb-4">
            Target vs. Actual
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {enriched
              .filter((p) => p.value > 0 && p.targetPct != null)
              .map((pos) => {
                const drift = pos.currentPct - (pos.targetPct ?? 0);
                const driftColor =
                  Math.abs(drift) <= 1
                    ? "var(--warm-green, #1A7A4A)"
                    : Math.abs(drift) <= 3
                      ? "var(--warm-amber, #A8690C)"
                      : "var(--warm-red, #B83232)";
                const scale = Math.max(pos.currentPct, pos.targetPct ?? 0, 20);

                return (
                  <div
                    key={pos.id}
                    className="border border-border rounded-md p-3.5 transition-colors"
                    style={{ borderLeftColor: pos.color, borderLeftWidth: 3 }}
                    onMouseEnter={() => setHovered(pos.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <div className="font-bold text-[13.5px] tracking-[0.03em]">
                          {pos.symbol}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {pos.shares} sh &middot; {usd(pos.value)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabnum text-[15px] font-bold">
                          {pct(pos.currentPct)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          of {pct(pos.targetPct)} target
                        </div>
                      </div>
                    </div>

                    {/* Drift bars */}
                    <div className="flex flex-col gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-[38px] text-right shrink-0">
                          actual
                        </span>
                        <div className="flex-1 h-[5px] bg-accent rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-400"
                            style={{
                              width: `${Math.min((pos.currentPct / scale) * 100, 100)}%`,
                              background: pos.color,
                            }}
                          />
                        </div>
                        <span className="tabnum text-[11px] text-muted-foreground w-[32px]">
                          {pct(pos.currentPct)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-[38px] text-right shrink-0">
                          target
                        </span>
                        <div className="flex-1 h-[5px] bg-accent rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-400"
                            style={{
                              width: `${Math.min(((pos.targetPct ?? 0) / scale) * 100, 100)}%`,
                              background: "var(--border)",
                            }}
                          />
                        </div>
                        <span className="tabnum text-[11px] text-muted-foreground w-[32px]">
                          {pct(pos.targetPct)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: driftColor }}
                    >
                      {sign(drift)} drift
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Add Position Dialog */}
      <Dialog open={showAddSearch} onOpenChange={setShowAddSearch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Position</DialogTitle>
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
                    onSelect={() => addPosition(r.symbol, r.name, r.type)}
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

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Save Version</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will lock current prices and create an immutable snapshot of
            your portfolio.
          </p>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Label
              </label>
              <Input
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="e.g., Q1 2025 Rebalance"
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </label>
              <Input
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                placeholder="Optional notes..."
                className="mt-1.5"
              />
            </div>
            <div className="bg-accent rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">
                Snapshot preview
              </div>
              <div className="text-sm font-semibold tabnum">
                {usd(totalValue)} &middot; {positions.length} positions
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveVersion} disabled={saving}>
              {saving ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
