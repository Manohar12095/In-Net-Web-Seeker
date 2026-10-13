import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Clock, GitCompare, RefreshCw, ChevronRight
} from "lucide-react";

interface RunItem {
  id: string;
  status: string;
  started_at: string;
  finished_at?: string;
  config?: any;
}

interface ProjectDetail {
  id: string;
  name: string;
  target: string;
  created_at: string;
  runs: RunItem[];
}

interface DiffResult {
  run_id_old: string;
  run_id_new: string;
  added: Array<{ url: string; sha256?: string; size: number; mime?: string }>;
  removed: Array<{ url: string; sha256?: string; size: number; mime?: string }>;
  modified: Array<{ url: string; sha256_old?: string; sha256_new?: string; size_old: number; size_new: number }>;
  unchanged_count: number;
  summary: {
    total_old: number;
    total_new: number;
    added_count: number;
    removed_count: number;
    modified_count: number;
  };
}

interface SnapshotsDiffProps {
  projectId: string;
}

function fmtBytes(b: number): string {
  if (!b || b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function SnapshotsDiff({ projectId }: SnapshotsDiffProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [runA, setRunA] = useState<string>("");
  const [runB, setRunB] = useState<string>("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const fetchProject = async () => {
    setLoadingProject(true);
    try {
      const data = await api<ProjectDetail>(`/api/projects/${projectId}`);
      setProject(data);
      if (data.runs && data.runs.length >= 2) {
        setRunA(data.runs[1].id);
        setRunB(data.runs[0].id);
      } else if (data.runs && data.runs.length === 1) {
        setRunA(data.runs[0].id);
        setRunB(data.runs[0].id);
      }
    } catch {
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const compareRuns = async () => {
    if (!runA || !runB) return;
    setDiffLoading(true);
    try {
      const res = await api<DiffResult>(`/api/projects/${projectId}/diff?run_a=${encodeURIComponent(runA)}&run_b=${encodeURIComponent(runB)}`);
      setDiff(res);
    } catch {
      setDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (runA && runB) {
      compareRuns();
    }
  }, [runA, runB]);

  if (loadingProject) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        Loading snapshot history...
      </div>
    );
  }

  const runs = project?.runs || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-base font-mono font-bold text-zinc-100">
            Snapshots & Temporal Diffing
          </h2>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          {runs.length} recorded collection runs
        </span>
      </div>

      {runs.length < 2 ? (
        <div className="p-8 bg-zinc-950/70 border border-zinc-800 rounded-xl text-center font-mono text-xs text-zinc-400 space-y-3">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="font-semibold text-zinc-300">Minimum 2 Collection Runs Required for Diffing</p>
          <p className="text-zinc-500 max-w-md mx-auto">
            You currently have {runs.length} run on record. Trigger another collection run on this target to unlock automatic SHA-256 asset drift detection and site changes.
          </p>
        </div>
      ) : (
        <>
          {/* Comparison Selector */}
          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <label className="text-zinc-500 text-[10px] uppercase font-bold">Baseline Run (Old)</label>
                <select
                  value={runA}
                  onChange={e => setRunA(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2DD4BF]"
                >
                  {runs.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id.slice(0, 8)} · {r.started_at.split("T")[0]} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-600 mt-5 hidden sm:block" />

              <div className="space-y-1">
                <label className="text-zinc-500 text-[10px] uppercase font-bold">Target Run (New)</label>
                <select
                  value={runB}
                  onChange={e => setRunB(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2DD4BF]"
                >
                  {runs.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id.slice(0, 8)} · {r.started_at.split("T")[0]} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={compareRuns}
              disabled={diffLoading}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-[#2DD4BF] flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${diffLoading ? "animate-spin" : ""}`} />
              Re-Compare
            </button>
          </div>

          {/* Diff Summary Cards */}
          {diff && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3.5 bg-teal-950/20 border border-teal-800/40 rounded-xl">
                <span className="text-[10px] text-teal-400 font-bold uppercase">Added Assets</span>
                <div className="text-2xl font-bold text-[#2DD4BF] mt-1">
                  +{diff.summary.added_count}
                </div>
              </div>

              <div className="p-3.5 bg-red-950/20 border border-red-800/40 rounded-xl">
                <span className="text-[10px] text-red-400 font-bold uppercase">Removed Assets</span>
                <div className="text-2xl font-bold text-red-400 mt-1">
                  -{diff.summary.removed_count}
                </div>
              </div>

              <div className="p-3.5 bg-yellow-950/20 border border-yellow-800/40 rounded-xl">
                <span className="text-[10px] text-yellow-400 font-bold uppercase">Modified (Hash Changed)</span>
                <div className="text-2xl font-bold text-yellow-400 mt-1">
                  Δ {diff.summary.modified_count}
                </div>
              </div>

              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Unchanged</span>
                <div className="text-2xl font-bold text-zinc-300 mt-1">
                  {diff.unchanged_count}
                </div>
              </div>
            </div>
          )}

          {/* Diff Detail Tables */}
          {diff && (
            <div className="space-y-4">
              {/* Modified Resources */}
              {diff.modified.length > 0 && (
                <div className="rounded-xl bg-zinc-950/70 border border-yellow-900/40 overflow-hidden font-mono text-xs">
                  <div className="p-3 bg-yellow-950/30 border-b border-yellow-900/40 text-yellow-300 font-bold flex justify-between">
                    <span>Modified Resources (Content Changed)</span>
                    <span>{diff.modified.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-850 p-2">
                    {diff.modified.map((m, i) => (
                      <div key={i} className="p-2 space-y-1">
                        <p className="text-zinc-200 font-semibold break-all">{m.url}</p>
                        <div className="flex gap-4 text-[11px] text-zinc-500">
                          <span>Old: {m.sha256_old?.slice(0, 10)}… ({fmtBytes(m.size_old)})</span>
                          <span>→</span>
                          <span className="text-yellow-400">New: {m.sha256_new?.slice(0, 10)}… ({fmtBytes(m.size_new)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Resources */}
              {diff.added.length > 0 && (
                <div className="rounded-xl bg-zinc-950/70 border border-teal-900/40 overflow-hidden font-mono text-xs">
                  <div className="p-3 bg-teal-950/30 border-b border-teal-900/40 text-[#2DD4BF] font-bold flex justify-between">
                    <span>Newly Discovered Assets</span>
                    <span>+{diff.added.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-850 p-2 max-h-60 overflow-auto">
                    {diff.added.map((a, i) => (
                      <div key={i} className="p-1.5 flex justify-between items-center text-zinc-300">
                        <span className="truncate max-w-lg">{a.url}</span>
                        <span className="text-teal-400">{fmtBytes(a.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Resources */}
              {diff.removed.length > 0 && (
                <div className="rounded-xl bg-zinc-950/70 border border-red-900/40 overflow-hidden font-mono text-xs">
                  <div className="p-3 bg-red-950/30 border-b border-red-900/40 text-red-400 font-bold flex justify-between">
                    <span>Missing / Removed Assets</span>
                    <span>-{diff.removed.length}</span>
                  </div>
                  <div className="divide-y divide-zinc-850 p-2 max-h-60 overflow-auto">
                    {diff.removed.map((r, i) => (
                      <div key={i} className="p-1.5 flex justify-between items-center text-zinc-400">
                        <span className="truncate max-w-lg">{r.url}</span>
                        <span>{fmtBytes(r.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
