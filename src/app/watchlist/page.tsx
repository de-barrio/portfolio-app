"use client";

import { useState } from "react";
import useSWR from "swr";
import { usd, sign } from "@/lib/format";
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
import { Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WatchlistPage() {
  const { data: items, isLoading, mutate } = useSWR("/api/watchlist", fetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
            <div key={i} className="px-3.5 py-3 border-b border-border flex items-center gap-4">
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
                {["Ticker", "Name", "Type", "Price", "Day Change", "Note", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-3.5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] border-b border-border whitespace-nowrap"
                      style={{
                        textAlign: i === 0 || i === 1 || i === 5 ? "left" : "right",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {items.map(
                (item: {
                  id: string;
                  symbol: string;
                  name: string | null;
                  type: string;
                  price: number;
                  changePercent: number;
                  note: string | null;
                }) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--warm-border-light,#EDE9E2)] hover:bg-accent transition-colors"
                  >
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
                    <td className="px-3.5 py-2.5">
                      <Input
                        defaultValue={item.note ?? ""}
                        placeholder="Add note..."
                        className="h-7 text-xs border-none bg-transparent"
                        onBlur={(e) => updateNote(item.id, e.target.value)}
                      />
                    </td>
                    <td className="px-2.5 py-2.5">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                )
              )}
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
