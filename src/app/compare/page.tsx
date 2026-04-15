"use client";

import { useState } from "react";
import { usd, sign, signUsd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompareArrows } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Mode = "versions" | "portfolios";

interface Portfolio {
  id: string;
  name: string;
}

interface Version {
  id: string;
  versionNumber: number;
  label: string | null;
}

interface VersionDetail {
  label: string | null;
  versionNumber: number;
  baselineValue: number;
  currentValue: number;
  returnPct: number;
  positions?: { symbol: string; shares: number; currentValue?: number }[];
}

interface DraftPosition {
  symbol: string;
  name: string;
  shares: number;
  value: number;
  change: number | null;
  changePercent: number | null;
}

interface DraftDetail {
  baseCapital: number;
  totalValue: number;
  totalDayChange: number;
  totalDayChangePct: number;
  positions: DraftPosition[];
}

function resolvePortfolioName(
  portfolios: Portfolio[] | undefined,
  id: string
) {
  return portfolios?.find((p) => p.id === id)?.name;
}

function resolveVersionName(versions: Version[] | undefined, id: string) {
  const v = versions?.find((v) => v.id === id);
  return v ? v.label || `v${v.versionNumber}` : undefined;
}

export default function ComparePage() {
  const [mode, setMode] = useState<Mode>("versions");

  // --- shared ---
  const { data: portfolios } = useSWR<Portfolio[]>(
    "/api/portfolios",
    fetcher
  );

  // --- versions mode ---
  const [selectedPortfolio, setSelectedPortfolio] = useState("");
  const [versionAId, setVersionAId] = useState("");
  const [versionBId, setVersionBId] = useState("");

  const { data: versions } = useSWR<Version[]>(
    mode === "versions" && selectedPortfolio
      ? `/api/portfolios/${selectedPortfolio}/versions`
      : null,
    fetcher
  );

  const { data: versionA } = useSWR<VersionDetail>(
    mode === "versions" && versionAId
      ? `/api/versions/${versionAId}`
      : null,
    fetcher
  );
  const { data: versionB } = useSWR<VersionDetail>(
    mode === "versions" && versionBId
      ? `/api/versions/${versionBId}`
      : null,
    fetcher
  );

  // --- portfolios mode ---
  const [portfolioAId, setPortfolioAId] = useState("");
  const [portfolioBId, setPortfolioBId] = useState("");

  const { data: draftA } = useSWR<DraftDetail>(
    mode === "portfolios" && portfolioAId
      ? `/api/portfolios/${portfolioAId}/draft`
      : null,
    fetcher
  );
  const { data: draftB } = useSWR<DraftDetail>(
    mode === "portfolios" && portfolioBId
      ? `/api/portfolios/${portfolioBId}/draft`
      : null,
    fetcher
  );

  function handleModeChange(value: any) {
    if (value === null) return;
    const next = value as Mode;
    setMode(next);
    // reset all selections
    setSelectedPortfolio("");
    setVersionAId("");
    setVersionBId("");
    setPortfolioAId("");
    setPortfolioBId("");
  }

  const portfolioAName = resolvePortfolioName(portfolios, portfolioAId);
  const portfolioBName = resolvePortfolioName(portfolios, portfolioBId);

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">
          {mode === "versions" ? "Compare Versions" : "Compare Portfolios"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "versions"
            ? "Compare two saved versions side by side"
            : "Compare two portfolios side by side"}
        </p>
      </div>

      {/* Mode toggle */}
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="mb-5">
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Selectors */}
      {mode === "versions" ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Portfolio
            </label>
            <Select
              value={selectedPortfolio}
              onValueChange={(v) => {
                setSelectedPortfolio(v ?? "");
                setVersionAId("");
                setVersionBId("");
              }}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left">
                  {resolvePortfolioName(portfolios, selectedPortfolio) ??
                    "Select portfolio..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {portfolios?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Version A
            </label>
            <Select
              value={versionAId}
              onValueChange={(v) => setVersionAId(v ?? "")}
              disabled={!versions?.length}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left">
                  {resolveVersionName(versions, versionAId) ??
                    "Select version..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {versions?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label || `v${v.versionNumber}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Version B
            </label>
            <Select
              value={versionBId}
              onValueChange={(v) => setVersionBId(v ?? "")}
              disabled={!versions?.length}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left">
                  {resolveVersionName(versions, versionBId) ??
                    "Select version..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {versions?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label || `v${v.versionNumber}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Portfolio A
            </label>
            <Select
              value={portfolioAId}
              onValueChange={(v) => setPortfolioAId(v ?? "")}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left">
                  {resolvePortfolioName(portfolios, portfolioAId) ??
                    "Select portfolio..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {portfolios?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
              Portfolio B
            </label>
            <Select
              value={portfolioBId}
              onValueChange={(v) => setPortfolioBId(v ?? "")}
            >
              <SelectTrigger>
                <span className="flex flex-1 text-left">
                  {resolvePortfolioName(portfolios, portfolioBId) ??
                    "Select portfolio..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {portfolios?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Version comparison */}
      {mode === "versions" && versionA && versionB ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <VersionStatsCard data={versionA} />
            <VersionStatsCard data={versionB} />
          </div>
          <HoldingsDiff
            positionsA={versionA.positions ?? []}
            positionsB={versionB.positions ?? []}
          />
        </div>
      ) : mode === "versions" ? (
        <EmptyState message="Select a portfolio and two versions to compare" />
      ) : null}

      {/* Portfolio comparison */}
      {mode === "portfolios" && draftA && draftB ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <DraftStatsCard
              name={portfolioAName ?? "Portfolio A"}
              data={draftA}
            />
            <DraftStatsCard
              name={portfolioBName ?? "Portfolio B"}
              data={draftB}
            />
          </div>
          <HoldingsDiff
            positionsA={draftA.positions.map((p) => ({
              symbol: p.symbol,
              shares: p.shares,
              currentValue: p.value,
            }))}
            positionsB={draftB.positions.map((p) => ({
              symbol: p.symbol,
              shares: p.shares,
              currentValue: p.value,
            }))}
          />
        </div>
      ) : mode === "portfolios" ? (
        <EmptyState message="Select two portfolios to compare" />
      ) : null}
    </div>
  );
}

/* ---------- sub-components ---------- */

function VersionStatsCard({ data }: { data: VersionDetail }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-serif text-sm font-semibold mb-3">
          {data.label || `v${data.versionNumber}`}
        </h3>
        <div className="space-y-2">
          <StatRow label="Baseline" value={usd(data.baselineValue)} />
          <StatRow label="Current" value={usd(data.currentValue)} />
          <StatRow
            label="Return"
            value={sign(data.returnPct)}
            className={
              data.returnPct >= 0 ? "text-warm-green" : "text-warm-red"
            }
          />
          <StatRow
            label="Positions"
            value={String(data.positions?.length ?? 0)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DraftStatsCard({
  name,
  data,
}: {
  name: string;
  data: DraftDetail;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-serif text-sm font-semibold mb-3">{name}</h3>
        <div className="space-y-2">
          <StatRow label="Market Value" value={usd(data.totalValue)} />
          <StatRow label="Base Capital" value={usd(data.baseCapital)} />
          <StatRow
            label="Day's Change"
            value={`${signUsd(data.totalDayChange)} (${sign(data.totalDayChangePct)})`}
            className={
              data.totalDayChange >= 0 ? "text-warm-green" : "text-warm-red"
            }
          />
          <StatRow
            label="Positions"
            value={String(data.positions.length)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabnum font-medium ${className ?? ""}`}>{value}</span>
    </div>
  );
}

function HoldingsDiff({
  positionsA,
  positionsB,
}: {
  positionsA: { symbol: string; shares: number; currentValue?: number }[];
  positionsB: { symbol: string; shares: number; currentValue?: number }[];
}) {
  const aMap = new Map(positionsA.map((p) => [p.symbol, p]));
  const bMap = new Map(positionsB.map((p) => [p.symbol, p]));
  const allSymbols = [...new Set([...aMap.keys(), ...bMap.keys()])];

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-serif text-sm font-semibold mb-3">Holdings Diff</h3>
        <div className="space-y-1">
          {allSymbols.map((sym) => {
            const a = aMap.get(sym);
            const b = bMap.get(sym);
            const added = !a && b;
            const removed = a && !b;
            const changed = a && b && a.shares !== b.shares;
            return (
              <div
                key={sym}
                className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs tracking-wide">{sym}</span>
                  {added && (
                    <span className="text-[10px] text-warm-green font-medium">
                      ADDED
                    </span>
                  )}
                  {removed && (
                    <span className="text-[10px] text-warm-red font-medium">
                      REMOVED
                    </span>
                  )}
                </div>
                <div className="tabnum text-xs text-muted-foreground">
                  {a?.shares ?? 0} → {b?.shares ?? 0} shares
                  {changed && (
                    <span
                      className={`ml-2 font-medium ${
                        (b?.shares ?? 0) > (a?.shares ?? 0)
                          ? "text-warm-green"
                          : "text-warm-red"
                      }`}
                    >
                      {(b?.shares ?? 0) > (a?.shares ?? 0) ? "+" : ""}
                      {(b?.shares ?? 0) - (a?.shares ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <GitCompareArrows className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
