"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  GitCompareArrows,
  Eye,
  Terminal,
  StickyNote,
  Settings,
  Plus,
  Search,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Portfolios
          </CommandItem>
          <CommandItem onSelect={() => navigate("/compare")}>
            <GitCompareArrows className="w-4 h-4 mr-2" />
            Compare Versions
          </CommandItem>
          <CommandItem onSelect={() => navigate("/watchlist")}>
            <Eye className="w-4 h-4 mr-2" />
            Watchlist
          </CommandItem>
          <CommandItem onSelect={() => navigate("/research")}>
            <Terminal className="w-4 h-4 mr-2" />
            Research
          </CommandItem>
          <CommandItem onSelect={() => navigate("/notes")}>
            <StickyNote className="w-4 h-4 mr-2" />
            Notes
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate("/")}>
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </CommandItem>
          <CommandItem onSelect={() => navigate("/research")}>
            <Search className="w-4 h-4 mr-2" />
            Run Research Command
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
