import { useState, useEffect } from "react";
import {
  Search, Wrench, Plus, Home, CornerDownLeft
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome: () => void;
  onOpenTools: () => void;
  onOpenNewCollection?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateHome,
  onOpenTools,
  onOpenNewCollection,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    {
      id: "home",
      label: "Navigate Home",
      category: "Navigation",
      icon: Home,
      action: () => {
        onNavigateHome();
        onClose();
      },
    },
    {
      id: "tools",
      label: "Open Standalone Utilities (DNS, TLS, Headers, Hasher)",
      category: "Tools",
      icon: Wrench,
      action: () => {
        onOpenTools();
        onClose();
      },
    },
    {
      id: "new",
      label: "Start New Website Collection",
      category: "Actions",
      icon: Plus,
      action: () => {
        if (onOpenNewCollection) onOpenNewCollection();
        onClose();
      },
    },
  ];

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-xl bg-[#0E0E14] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Input */}
        <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-950 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search actions (e.g. tools, home)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-xs"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* List */}
        <div className="p-2 max-h-72 overflow-y-auto divide-y divide-zinc-850">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-zinc-600">No matching actions found.</div>
          ) : (
            filtered.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full p-2.5 rounded-lg flex items-center justify-between hover:bg-zinc-900/80 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-[#2DD4BF] transition-colors" />
                    <div>
                      <span className="text-zinc-200 group-hover:text-white font-medium">
                        {item.label}
                      </span>
                      <span className="block text-[10px] text-zinc-500">{item.category}</span>
                    </div>
                  </div>
                  <CornerDownLeft className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950 text-[10px] text-zinc-500 flex justify-between">
          <span>In Net Web Seeker Quick Navigator</span>
          <div className="flex gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
