"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data: settings, isLoading, mutate } = useSWR("/api/settings", fetcher);

  const [riskFreeRate, setRiskFreeRate] = useState("0.05");
  const [defaultBenchmark, setDefaultBenchmark] = useState("SPY");
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [refreshInterval, setRefreshInterval] = useState("300");

  useEffect(() => {
    if (settings && !settings.error) {
      const map = new Map<string, string>();
      settings.forEach((s: { key: string; value: string }) =>
        map.set(s.key, s.value)
      );
      setRiskFreeRate(map.get("riskFreeRate") ?? "0.05");
      setDefaultBenchmark(map.get("defaultBenchmark") ?? "SPY");
      setCurrency(map.get("currency") ?? "USD");
      setDateFormat(map.get("dateFormat") ?? "MM/DD/YYYY");
      setRefreshInterval(map.get("refreshInterval") ?? "300");
    }
  }, [settings]);

  async function handleSave() {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskFreeRate,
          defaultBenchmark,
          currency,
          dateFormat,
          refreshInterval,
        }),
      });
      toast.success("Settings saved");
      mutate();
    } catch {
      toast.error("Failed to save settings");
    }
  }

  if (isLoading) {
    return (
      <div className="p-7 max-w-2xl">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-9 w-32 mb-3" />
                <Skeleton className="h-9 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your application preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Analytics */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-serif text-[15px] font-semibold mb-4">
              Analytics
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Risk-Free Rate (for Sharpe Ratio)
                </label>
                <Input
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(e.target.value)}
                  placeholder="0.05"
                  className="mt-1.5 w-32"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  As a decimal (e.g., 0.05 = 5%)
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Default Benchmark
                </label>
                <Input
                  value={defaultBenchmark}
                  onChange={(e) =>
                    setDefaultBenchmark(e.target.value.toUpperCase())
                  }
                  placeholder="SPY"
                  className="mt-1.5 w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Data */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-serif text-[15px] font-semibold mb-4">
              Market Data
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Refresh Interval (seconds)
                </label>
                <Input
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  placeholder="300"
                  className="mt-1.5 w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-serif text-[15px] font-semibold mb-4">
              Display
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Currency
                </label>
                <Select value={currency} onValueChange={(v) => setCurrency(v ?? "USD")}>
                  <SelectTrigger className="mt-1.5 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date Format
                </label>
                <Select value={dateFormat} onValueChange={(v) => setDateFormat(v ?? "MM/DD/YYYY")}>
                  <SelectTrigger className="mt-1.5 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
