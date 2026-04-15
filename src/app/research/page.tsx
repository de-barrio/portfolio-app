"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import { COMMANDS, COMMAND_KEYS, type CommandKey } from "@/lib/research/prompts";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, Send, Clock, StickyNote } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResearchPage() {
  const [command, setCommand] = useState<CommandKey>("research-company");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: runs, mutate: mutateRuns } = useSWR("/api/research", fetcher);
  const outputRef = useRef("");

  const handleRun = useCallback(async () => {
    if (!input.trim()) return;
    setStreaming(true);
    setOutput("");
    outputRef.current = "";

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, input: input.trim() }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let pendingUpdate = "";
      let rafId: number | null = null;

      const flushUpdate = () => {
        if (pendingUpdate) {
          outputRef.current += pendingUpdate;
          const snapshot = outputRef.current;
          pendingUpdate = "";
          setOutput(snapshot);
        }
        rafId = null;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "delta") {
              pendingUpdate += data.text;
              if (!rafId) {
                rafId = requestAnimationFrame(flushUpdate);
              }
            } else if (eventType === "done") {
              // Flush any remaining text
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              outputRef.current += pendingUpdate;
              pendingUpdate = "";
              setOutput(outputRef.current);
              mutateRuns();
            } else if (eventType === "error") {
              throw new Error(data.message);
            }
          }
        }
      }

      // Final flush
      if (pendingUpdate) {
        if (rafId) cancelAnimationFrame(rafId);
        outputRef.current += pendingUpdate;
        setOutput(outputRef.current);
      }
    } catch {
      toast.error("Research command failed");
    } finally {
      setStreaming(false);
    }
  }, [command, input, mutateRuns]);

  async function handleSaveToNotes() {
    if (!output.trim()) return;
    setSaving(true);
    try {
      const title = `${COMMANDS[command].label}: ${input}`;
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: output,
          source: "ai-research",
          commandType: command,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Saved to notes");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-7">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Research</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered research commands for your portfolio analysis
        </p>
      </div>

      {/* Command input */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-[200px_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Command
              </label>
              <Select
                value={command}
                onValueChange={(v) => setCommand(v as CommandKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMAND_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      /{key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Input
              </label>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  command === "research-company"
                    ? "e.g., AAPL"
                    : command === "research-fund"
                      ? "e.g., SPY"
                      : "Enter context..."
                }
                onKeyDown={(e) => e.key === "Enter" && handleRun()}
              />
            </div>
            <Button onClick={handleRun} disabled={streaming || !input.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {streaming ? "Running..." : "Run"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {COMMANDS[command].description}
          </p>
        </CardContent>
      </Card>

      {/* Output */}
      {(output || streaming) && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-[10px]">
                /{command}
              </Badge>
              {output && !streaming && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleSaveToNotes}
                  disabled={saving}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : "Save to Notes"}
                </Button>
              )}
            </div>
            <div className={streaming ? "streaming-cursor" : ""}>
              <MarkdownRenderer content={output} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {runs?.length > 0 && (
        <div>
          <h2 className="font-serif text-[15px] font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent Research
          </h2>
          <div className="space-y-2">
            {runs.slice(0, 10).map(
              (run: {
                id: string;
                command: string;
                input: string;
                output: string;
                createdAt: string;
              }) => (
                <Card
                  key={run.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => {
                    setCommand(run.command as CommandKey);
                    setInput(run.input);
                    setOutput(run.output);
                  }}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">
                        /{run.command}
                      </Badge>
                      <span className="text-sm truncate max-w-[300px]">
                        {run.input}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
