import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FolderKanban, Wrench, Search } from "lucide-react";
import logoImg from "@/assets/T_logo.png";

interface AppShellProps {
  children: React.ReactNode;
  activeProject?: { id: string; name: string; target: string } | null;
  onNavigateHome: () => void;
  onOpenTools?: () => void;
  onOpenCommandPalette?: () => void;
}

export function AppShell({
  children,
  activeProject,
  onNavigateHome,
  onOpenTools,
  onOpenCommandPalette,
}: AppShellProps) {
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const checkEngine = () => {
      api<{ ok: boolean }>("/api/health")
        .then(() => {
          if (alive) setEngineOnline(true);
        })
        .catch(() => {
          if (alive) setEngineOnline(false);
        });
    };

    checkEngine();
    const interval = setInterval(checkEngine, 8000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0F] text-[#E4E4ED] selection:bg-[#2DD4BF]/20 selection:text-[#2DD4BF]">
      {/* Top Cockpit Header */}
      <header className="h-14 border-b border-white/6 bg-[#0E0E14]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            title="Return to IN Net Web Seeker Home"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#2DD4BF]/30 bg-black/40 flex items-center justify-center group-hover:border-[#2DD4BF] group-hover:shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all">
              <img 
                src={logoImg} 
                alt="IN NET Creations Logo" 
                className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform" 
              />
            </div>
            <div>
              <div className="text-sm font-bold font-display tracking-tight text-zinc-100 group-hover:text-white flex items-center gap-2">
                <span>In Net Web Seeker</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-white/6 font-normal">v0.1.0</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-tight">
                IN NET Creations
              </div>
            </div>
          </button>

          {activeProject && (
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/8 text-xs font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span className="text-zinc-300 max-w-[200px] truncate">{activeProject.name}</span>
            </div>
          )}
        </div>

        {/* Status and Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Quick Navigator / Palette Button */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-white/6 hover:border-zinc-700 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Quick Search & Actions"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Command Palette</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                Ctrl+K
              </kbd>
            </button>
          )}

          {/* Standalone Tools Button */}
          {onOpenTools && (
            <button
              onClick={onOpenTools}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-white/6 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-[#2DD4BF] transition-colors"
              title="Standalone Intelligence Tools"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Tools</span>
            </button>
          )}

          {/* Engine Telemetry */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-white/6 text-xs font-mono">
            {engineOnline === true ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-zinc-300 text-[11px]">Engine 127.0.0.1:8765</span>
              </>
            ) : engineOnline === false ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-zinc-400 text-[11px]">Engine Offline</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                <span className="text-zinc-400 text-[11px]">Connecting...</span>
              </>
            )}
          </div>

          <div className="text-[11px] font-mono text-zinc-500 hidden md:block">
            Created by <span className="text-zinc-400 font-medium">S. Manohar</span>
          </div>
        </div>
      </header>

      {/* Main workspace view */}
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/6 bg-[#0E0E14]/60 py-3 px-6 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <span>In Net Web Seeker · Powered by IN NET Creations</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">Created by S. Manohar</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 text-[11px]">
          <span>GET-only</span>
          <span>•</span>
          <span>SSRF-guarded</span>
          <span>•</span>
          <span>SHA-256 Deduplicated</span>
          <span>•</span>
          <span>Zero Fabricated Data</span>
        </div>
      </footer>
    </div>
  );
}
