"use client";

import { useState } from "react";
import useSWR from "swr";
import { COMMANDS, COMMAND_KEYS, type CommandKey } from "@/lib/research/prompts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, Send, Clock } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ResearchPage() {
  const [command, setCommand] = useState<CommandKey>("research-company");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const { data: runs, mutate: mutateRuns } = useSWR("/api/research", fetcher);

  async function handleRun() {
    if (!input.trim()) return;
    setRunning(true);
    setOutput("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, input: input.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.output);
      mutateRuns();
    } catch {
      toast.error("Research command failed");
    } finally {
      setRunning(false);
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
            <Button onClick={handleRun} disabled={running || !input.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {running ? "Running..." : "Run"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {COMMANDS[command].description}
          </p>
        </CardContent>
      </Card>

      {/* Output */}
      {running && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {output && !running && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-[10px]">
                /{command}
              </Badge>
            </div>
            <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {output}
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
