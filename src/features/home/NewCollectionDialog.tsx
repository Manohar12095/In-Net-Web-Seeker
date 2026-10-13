import React, { useState } from "react";
import { Parsed } from "./useTargetValidation";
import { api } from "@/lib/api";
import { FolderPlus, Play, X, Layers, FileDigit, Cpu, HardDrive } from "lucide-react";

interface NewCollectionDialogProps {
  isOpen: boolean;
  target: Parsed | null;
  onClose: () => void;
  onProjectCreated: (project: { id: string; name: string; target: string; run_id: string }) => void;
}

export function NewCollectionDialog({
  isOpen,
  target,
  onClose,
  onProjectCreated,
}: NewCollectionDialogProps) {
  if (!isOpen || !target) return null;

  const defaultName = `${target.host || "target"} - ${new Date().toISOString().slice(0, 10)}`;
  const [projectName, setProjectName] = useState(defaultName);
  const [depth, setDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(50);
  const [concurrency, setConcurrency] = useState(4);
  const [maxFileMb, setMaxFileMb] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create project in DB
      const project = await api<{ id: string; name: string; target: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim() || defaultName,
          target: target.normalized,
        }),
      });

      // 2. Start initial collection run
      const run = await api<{ run_id: string }>("/api/collections", {
        method: "POST",
        body: JSON.stringify({
          project_id: project.id,
          target: target.normalized,
          depth,
          max_pages: maxPages,
          concurrency,
          max_file_mb: maxFileMb,
        }),
      });

      onProjectCreated({ ...project, run_id: run.run_id });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create project and initiate collection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121A] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/40 text-[#2DD4BF]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 font-display">New Intelligence Project</h2>
              <p className="text-xs text-zinc-400 font-mono">{target.normalized}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-sm text-zinc-200 focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30 outline-none"
              placeholder="e.g. Acme Corp Assessment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <Layers className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Crawl Depth</span>
              </label>
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:border-[#2DD4BF]/50 outline-none cursor-pointer"
              >
                <option value={1}>Depth 1 (Seed + direct assets)</option>
                <option value={2}>Depth 2 (Follow internal links)</option>
                <option value={3}>Depth 3 (Broad deep crawl)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <FileDigit className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Max Pages</span>
              </label>
              <select
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:border-[#2DD4BF]/50 outline-none cursor-pointer"
              >
                <option value={25}>25 pages (Fast)</option>
                <option value={50}>50 pages (Standard)</option>
                <option value={100}>100 pages (Deep)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <Cpu className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Workers Concurrency</span>
              </label>
              <select
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:border-[#2DD4BF]/50 outline-none cursor-pointer"
              >
                <option value={2}>2 workers (Quiet)</option>
                <option value={4}>4 workers (Balanced)</option>
                <option value={8}>8 workers (High throughput)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <HardDrive className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Max File Cap</span>
              </label>
              <select
                value={maxFileMb}
                onChange={(e) => setMaxFileMb(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:border-[#2DD4BF]/50 outline-none cursor-pointer"
              >
                <option value={10}>10 MB per asset</option>
                <option value={25}>25 MB (Recommended)</option>
                <option value={50}>50 MB per asset</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium bg-[#2DD4BF] text-zinc-950 hover:bg-[#20b8a3] shadow-[0_0_20px_rgba(45,212,191,0.25)] transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? "Launching..." : "Launch Collection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
