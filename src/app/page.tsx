"use client";

import { useState } from "react";
import Link from "next/link";
import { usePortfolios } from "@/lib/hooks";
import { usd, pct, sign } from "@/lib/format";
import { INTENT_TAGS } from "@/lib/constants";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { portfolios, isLoading, mutate } = usePortfolios();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          intentTag: newTag || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("Portfolio created");
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewTag("");
      mutate();
    } catch {
      toast.error("Failed to create portfolio");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
      toast.success("Portfolio deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/portfolios/${id}`);
      const portfolio = await res.json();
      const createRes = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${portfolio.name} (copy)`,
          description: portfolio.description,
          intentTag: portfolio.intentTag,
          benchmark: portfolio.benchmark,
          baseCapital: portfolio.draft?.baseCapital ?? 100000,
        }),
      });
      if (!createRes.ok) throw new Error("Failed");
      const newPortfolio = await createRes.json();

      // Copy positions
      if (portfolio.draft?.positions?.length) {
        await fetch(`/api/portfolios/${newPortfolio.id}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: portfolio.draft.positions.map(
              (p: { asset: { symbol: string; name: string; type: string }; shares: number; targetPct: number | null }) => ({
                symbol: p.asset.symbol,
                name: p.asset.name,
                type: p.asset.type,
                shares: p.shares,
                targetPct: p.targetPct,
              })
            ),
          }),
        });
      }
      toast.success("Portfolio duplicated");
      mutate();
    } catch {
      toast.error("Failed to duplicate");
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Portfolios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your investment portfolios
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Portfolio
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No portfolios yet. Create your first one.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map(
            (p: {
              id: string;
              name: string;
              description: string | null;
              intentTag: string | null;
              totalValue: number;
              positionCount: number;
              latestVersion: {
                versionNumber: number;
                baselineValue: number;
              } | null;
              baseCapital: number;
            }) => {
              const returnPct =
                p.latestVersion && p.latestVersion.baselineValue > 0
                  ? ((p.totalValue - p.latestVersion.baselineValue) /
                      p.latestVersion.baselineValue) *
                    100
                  : null;

              return (
                <Card
                  key={p.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/portfolios/${p.id}`}
                          className="font-serif text-[15px] font-semibold hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.intentTag && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px]"
                          >
                            {p.intentTag}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(p.id)}
                          >
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {p.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {p.description}
                      </p>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Market Value
                        </div>
                        <div className="font-serif text-lg font-semibold tabnum">
                          {usd(p.totalValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        {returnPct !== null && (
                          <span
                            className={`text-sm font-medium tabnum ${
                              returnPct >= 0
                                ? "text-warm-green"
                                : "text-warm-red"
                            }`}
                          >
                            {sign(returnPct)}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {p.positionCount} position
                          {p.positionCount !== 1 ? "s" : ""}
                          {p.latestVersion &&
                            ` · v${p.latestVersion.versionNumber}`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      )}

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              Create New Portfolio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Core Growth"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description..."
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Intent Tag
              </label>
              <Select value={newTag} onValueChange={(v) => setNewTag(v ?? "")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a tag..." />
                </SelectTrigger>
                <SelectContent>
                  {INTENT_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
