"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { usd, pct, sign } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/portfolio/stat-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Download } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function VersionDetailPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = use(params);
  const { data: version, isLoading } = useSWR(
    `/api/versions/${versionId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="p-7">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!version || version.error) {
    return (
      <div className="p-7">
        <p className="text-muted-foreground">Version not found.</p>
      </div>
    );
  }

  const daysSinceSave = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(version.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const header = "Symbol,Name,Shares,Baseline Price,Current Price,Baseline Value,Current Value,Return %";
    const rows = (version.positions ?? []).map(
      (p: { symbol: string; name: string | null; shares: number; baselinePrice: number; currentPrice: number; baselineValue: number; currentValue: number; returnPct: number }) =>
        `${p.symbol},"${(p.name ?? "").replace(/"/g, '""')}",${p.shares},${p.baselinePrice},${p.currentPrice},${p.baselineValue},${p.currentValue},${p.returnPct}`
    );
    const csv = [header, ...rows].join("\n");
    const label = version.label || `v${version.versionNumber}`;
    downloadFile(csv, `${label}-holdings.csv`, "text/csv");
  }

  function exportJSON() {
    const data = {
      version: version.versionNumber,
      label: version.label,
      createdAt: version.createdAt,
      baselineValue: version.baselineValue,
      currentValue: version.currentValue,
      returnPct: version.returnPct,
      positions: (version.positions ?? []).map(
        (p: { symbol: string; name: string | null; shares: number; baselinePrice: number; currentPrice: number; baselineValue: number; currentValue: number; returnPct: number }) => ({
          symbol: p.symbol,
          name: p.name,
          shares: p.shares,
          baselinePrice: p.baselinePrice,
          currentPrice: p.currentPrice,
          baselineValue: p.baselineValue,
          currentValue: p.currentValue,
          returnPct: p.returnPct,
        })
      ),
    };
    const label = version.label || `v${version.versionNumber}`;
    downloadFile(JSON.stringify(data, null, 2), `${label}-holdings.json`, "application/json");
  }

  return (
    <div className="p-7 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/portfolios/${id}/versions`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl font-semibold">
              {version.label || `Version ${version.versionNumber}`}
            </h1>
            <Badge variant="outline" className="text-[10px]">
              <Lock className="w-2.5 h-2.5 mr-1" />
              Immutable
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saved{" "}
            {new Date(version.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            {version.portfolio?.name}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Baseline Value" value={usd(version.baselineValue)} />
        <StatCard label="Current Value" value={usd(version.currentValue)} />
        <StatCard
          label="Return Since Save"
          value={sign(version.returnPct)}
          color={
            version.returnPct >= 0
              ? "var(--warm-green, #1A7A4A)"
              : "var(--warm-red, #B83232)"
          }
          sub={`${usd(version.gainLoss)} gain/loss`}
        />
        <StatCard
          label="Days Tracked"
          value={String(daysSinceSave)}
          sub={`${version.positions?.length ?? 0} positions`}
        />
      </div>

      {/* Notes */}
      {version.notes && (
        <Card className="mb-5">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Notes
            </div>
            <p className="text-sm">{version.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Holdings table (read-only) */}
      <Card className="overflow-hidden">
        <div className="px-[18px] py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-[15px] font-semibold">
              Holdings at Save
            </h2>
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={exportCSV} className="text-xs h-7">
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={exportJSON} className="text-xs h-7">
              <Download className="w-3 h-3 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-accent">
                {[
                  "Ticker",
                  "Shares",
                  "Baseline Price",
                  "Current Price",
                  "Baseline Value",
                  "Current Value",
                  "Return",
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
              {version.positions?.map(
                (pos: {
                  id: string;
                  symbol: string;
                  name: string | null;
                  shares: number;
                  baselinePrice: number;
                  currentPrice: number;
                  baselineValue: number;
                  currentValue: number;
                  returnPct: number;
                }) => (
                  <tr
                    key={pos.id}
                    className="border-b border-[var(--warm-border-light,#EDE9E2)]"
                  >
                    <td className="px-3.5 py-2.5">
                      <span className="font-bold text-[12.5px] tracking-[0.04em]">
                        {pos.symbol}
                      </span>
                      {pos.name && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {pos.name}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px]">
                      {pos.shares}
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                        {usd(pos.baselinePrice)}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px]">
                      {usd(pos.currentPrice)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] text-muted-foreground">
                      {usd(pos.baselineValue)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-semibold">
                      {usd(pos.currentValue)}
                    </td>
                    <td
                      className="px-3.5 py-2.5 text-right tabnum text-[12.5px] font-medium"
                      style={{
                        color:
                          pos.returnPct >= 0
                            ? "var(--warm-green, #1A7A4A)"
                            : "var(--warm-red, #B83232)",
                      }}
                    >
                      {sign(pos.returnPct)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-border bg-accent px-3.5 py-2.5 flex justify-end">
          <div className="flex items-center">
            <span className="text-[11px] font-semibold text-muted-foreground pr-6">
              TOTAL
            </span>
            <span className="tabnum text-[13px] font-bold w-[100px] text-right">
              {usd(version.currentValue)}
            </span>
            <span
              className="tabnum text-[12px] font-medium w-[80px] text-right"
              style={{
                color:
                  version.returnPct >= 0
                    ? "var(--warm-green, #1A7A4A)"
                    : "var(--warm-red, #B83232)",
              }}
            >
              {sign(version.returnPct)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
