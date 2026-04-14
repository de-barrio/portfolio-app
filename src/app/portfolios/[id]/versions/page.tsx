"use client";

import { use } from "react";
import Link from "next/link";
import { useVersions, usePortfolio } from "@/lib/hooks";
import { usd, sign } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";

export default function VersionTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { portfolio } = usePortfolio(id);
  const { versions, isLoading } = useVersions(id);

  return (
    <div className="p-7">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/portfolios/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-xl font-semibold">
            {portfolio?.name ?? "Portfolio"} &mdash; Versions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable snapshots of your portfolio over time
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No versions saved yet.</p>
            <p className="text-xs text-muted-foreground">
              Go to the workspace and click &quot;Save Version&quot; to create
              an immutable snapshot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map(
            (v: {
              id: string;
              versionNumber: number;
              label: string | null;
              notes: string | null;
              baselineValue: number;
              currentValue: number;
              gainLoss: number;
              returnPct: number;
              positionCount: number;
              createdAt: string;
            }) => (
              <Link key={v.id} href={`/portfolios/${id}/versions/${v.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold tabnum">
                          v{v.versionNumber}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {v.label || `Version ${v.versionNumber}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" · "}
                            {v.positionCount} positions
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Baseline
                          </div>
                          <div className="tabnum text-sm font-semibold">
                            {usd(v.baselineValue)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Current
                          </div>
                          <div className="tabnum text-sm font-semibold">
                            {usd(v.currentValue)}
                          </div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <div className="text-xs text-muted-foreground">
                            Return
                          </div>
                          <div
                            className={`tabnum text-sm font-semibold ${
                              v.returnPct >= 0
                                ? "text-warm-green"
                                : "text-warm-red"
                            }`}
                          >
                            {sign(v.returnPct)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {v.notes && (
                      <p className="text-xs text-muted-foreground mt-3 ml-11 line-clamp-2">
                        {v.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
