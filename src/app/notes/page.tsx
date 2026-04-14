"use client";

import { useState } from "react";
import useSWR from "swr";
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
import { Plus, Search, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: notes, isLoading, mutate } = useSWR(
    `/api/notes${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`,
    fetcher
  );
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  async function handleCreate() {
    if (!newContent.trim()) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || null,
          content: newContent.trim(),
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Note created");
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      mutate();
    } catch {
      toast.error("Failed to create note");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Research notes and saved analysis
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !notes?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <StickyNote className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? "No notes found." : "No notes yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map(
            (note: {
              id: string;
              title: string | null;
              content: string;
              source: string | null;
              commandType: string | null;
              asset: { symbol: string } | null;
              createdAt: string;
            }) => (
              <Card key={note.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {note.title && (
                          <span className="font-medium text-sm">
                            {note.title}
                          </span>
                        )}
                        {note.source && (
                          <Badge variant="outline" className="text-[9px]">
                            {note.source}
                          </Badge>
                        )}
                        {note.commandType && (
                          <Badge variant="secondary" className="text-[9px]">
                            /{note.commandType}
                          </Badge>
                        )}
                        {note.asset && (
                          <Badge variant="secondary" className="text-[9px]">
                            {note.asset.symbol}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Title
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Optional title..."
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note..."
                className="mt-1.5 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newContent.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
