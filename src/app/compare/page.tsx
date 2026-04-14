"use client";

import { useState, useEffect } from "react";
import { usd, pct, sign } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/portfolio/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompareArrows } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface VersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  baselineValue: number;
  currentValue: number;
  returnPct: number;
  positionCount: number;
  portfolioName?: string;
}

export default function ComparePage() {
  const { data: portfolios } = useSWR("/api/portfolios", fetcher);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("");
  const [versionAId, setVersionAId] = useState("");
  const [versionBId, setVersionBId] = useState("");

  const { data: versions } = useSWR(
    selectedPortfolio
      ? `/api/portfolios/${selectedPortfolio}/versions`
      : null,
    fetcher
  );

  const { data: versionA } = useSWR(
    versionAId ? `/api/versions/${versionAId}` : null,
    fetcher
  );
  const { data: versionB } = useSWR(
    versionBId ? `/api/versions/${versionBId}` : null,
    fetcher
  );

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Compare Versions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare two saved versions side by side
        </p>
      </div>

      {/* Selectors */}
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
              <SelectValue placeholder="Select portfolio..." />
            </SelectTrigger>
            <SelectContent>
              {portfolios?.map(
                (p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                )
              )}
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
              <SelectValue placeholder="Select version..." />
            </SelectTrigger>
            <SelectContent>
              {versions?.map(
                (v: { id: string; versionNumber: number; label: string | null }) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label || `v${v.versionNumber}`}
                  </SelectItem>
                )
              )}
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
              <SelectValue placeholder="Select version..." />
            </SelectTrigger>
            <SelectContent>
              {versions?.map(
                (v: { id: string; versionNumber: number; label: string | null }) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label || `v${v.versionNumber}`}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison */}
      {versionA && versionB ? (
        <div className="space-y-5">
          {/* Stats comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-serif text-sm font-semibold mb-3">
                  {versionA.label || `v${versionA.versionNumber}`}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Baseline</span>
                    <span className="tabnum font-medium">
                      {usd(versionA.baselineValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span className="tabnum font-medium">
                      {usd(versionA.currentValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return</span>
                    <span
                      className={`tabnum font-medium ${
                        versionA.returnPct >= 0
                          ? "text-warm-green"
                          : "text-warm-red"
                      }`}
                    >
                      {sign(versionA.returnPct)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Positions</span>
                    <span>{versionA.positions?.length ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="font-serif text-sm font-semibold mb-3">
                  {versionB.label || `v${versionB.versionNumber}`}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Baseline</span>
                    <span className="tabnum font-medium">
                      {usd(versionB.baselineValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span className="tabnum font-medium">
                      {usd(versionB.currentValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return</span>
                    <span
                      className={`tabnum font-medium ${
                        versionB.returnPct >= 0
                          ? "text-warm-green"
                          : "text-warm-red"
                      }`}
                    >
                      {sign(versionB.returnPct)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Positions</span>
                    <span>{versionB.positions?.length ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Holdings diff */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-serif text-sm font-semibold mb-3">
                Holdings Diff
              </h3>
              <div className="space-y-1">
                {(() => {
                  const aMap = new Map<string, { shares: number; symbol: string }>();
                  const bMap = new Map<string, { shares: number; symbol: string }>();
                  versionA.positions?.forEach(
                    (p: { symbol: string; shares: number }) =>
                      aMap.set(p.symbol, p)
                  );
                  versionB.positions?.forEach(
                    (p: { symbol: string; shares: number }) =>
                      bMap.set(p.symbol, p)
                  );
                  const allSymbols = new Set([
                    ...aMap.keys(),
                    ...bMap.keys(),
                  ]);
                  return [...allSymbols].map((sym) => {
                    const a = aMap.get(sym);
                    const b = bMap.get(sym);
                    const added = !a && b;
                    const removed = a && !b;
                    const changed =
                      a && b && a.shares !== b.shares;
                    return (
                      <div
                        key={sym}
                        className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs tracking-wide">
                            {sym}
                          </span>
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
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompareArrows className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Select a portfolio and two versions to compare
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
