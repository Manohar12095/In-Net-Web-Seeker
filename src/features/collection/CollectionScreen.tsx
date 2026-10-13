import { useEffect, useRef, useState, useCallback } from "react";
import { api, sse } from "@/lib/api";
import {
  X, ChevronDown, ChevronUp, Download, Globe, FileText, Image,
  Code, Layers, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, Activity, HardDrive, Link2, Cpu,
} from "lucide-react";
import { DnsPanel, RdapPanel } from "./IntelligencePanels";


// ─── Types ────────────────────────────────────────────────────────────────────
interface ResourceEvent {
  type: "resource";
  url: string;
  status: "ok" | "http_error" | "skipped" | "blocked" | "too_large" | "error";
  http_status?: number;
  mime?: string;
  bytes?: number;
  depth?: number;
  sha256?: string;
  duplicate?: boolean;
  detected?: string;
  error?: string;
}

interface SummaryEvent {
  type: "summary";
  pages: number;
  bytes: number;
  external_origins: string[];
}

interface ErrorEvent {
  type: "error";
  url?: string;
  error: string;
}

interface EndEvent {
  type: "end";
  status: "done" | "cancelled" | "failed";
}

type CrawlEvent = ResourceEvent | SummaryEvent | ErrorEvent | EndEvent | { type: string; [k: string]: any };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function mimeIcon(mime?: string) {
  const m = mime ?? "";
  if (m.includes("html")) return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  if (m.includes("css")) return <Code className="w-3.5 h-3.5 text-purple-400" />;
  if (m.includes("javascript")) return <Code className="w-3.5 h-3.5 text-yellow-400" />;
  if (m.includes("image")) return <Image className="w-3.5 h-3.5 text-pink-400" />;
  if (m.includes("font")) return <Layers className="w-3.5 h-3.5 text-orange-400" />;
  return <Globe className="w-3.5 h-3.5 text-zinc-400" />;
}

function statusBadge(status: string, httpStatus?: number) {
  if (status === "ok") return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40">OK</span>
  );
  if (status === "http_error") return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-400 border border-red-800/40">
      {httpStatus ?? "ERR"}
    </span>
  );
  if (status === "blocked") return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-800/40">BLOCKED</span>
  );
  if (status === "too_large") return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-950/60 text-orange-400 border border-orange-800/40">TOO LARGE</span>
  );
  if (status === "skipped") return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-500">SKIP</span>
  );
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-500">{status.toUpperCase()}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CollectionScreenProps {
  project: { id: string; name: string; target: string };
  runId: string;
  onBack: () => void;
}

export function CollectionScreen({ project, runId, onBack }: CollectionScreenProps) {
  const [events, setEvents] = useState<CrawlEvent[]>([]);
  const [resources, setResources] = useState<ResourceEvent[]>([]);
  const [status, setStatus] = useState<"running" | "done" | "cancelled" | "failed">("running");
  const [summary, setSummary] = useState<SummaryEvent | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [filter, setFilter] = useState<"all" | "ok" | "error" | "skipped">("all");

  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Counters
  const okCount = resources.filter(r => r.status === "ok").length;
  const errorCount = resources.filter(r => r.status !== "ok" && r.status !== "skipped").length;
  const totalBytes = resources.reduce((a, r) => a + (r.bytes ?? 0), 0);
  const dupCount = resources.filter(r => r.duplicate).length;

  // Stream SSE events
  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        for await (const ev of sse<CrawlEvent>(`/api/collections/${runId}/events`, ctrl.signal)) {
          setEvents(prev => [...prev.slice(-500), ev]); // Keep last 500 in log
          if (ev.type === "resource") {
            setResources(prev => [...prev, ev as ResourceEvent]);
          } else if (ev.type === "summary") {
            setSummary(ev as SummaryEvent);
          } else if (ev.type === "end") {
            setStatus((ev as EndEvent).status);
            break;
          }
        }
      } catch {
        // aborted or network error
      }
    })();

    return () => ctrl.abort();
  }, [runId]);

  // Auto-scroll log
  useEffect(() => {
    if (showLog) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, showLog]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await api(`/api/collections/${runId}/cancel`, { method: "POST" });
    } catch { /* best-effort */ }
  }, [runId]);

  const filteredResources = resources.filter(r => {
    if (filter === "ok") return r.status === "ok";
    if (filter === "error") return r.status !== "ok" && r.status !== "skipped";
    if (filter === "skipped") return r.status === "skipped";
    return true;
  });

  const isFinished = status !== "running";

  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-zinc-900 border border-white/8 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-display text-zinc-100">{project.name}</h1>
              {isFinished ? (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border
                  ${status === "done" ? "bg-teal-950/60 text-[#2DD4BF] border-teal-800/40" :
                    status === "cancelled" ? "bg-orange-950/60 text-orange-400 border-orange-800/40" :
                    "bg-red-950/60 text-red-400 border-red-800/40"}`}>
                  {status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   status === "cancelled" ? <XCircle className="w-3.5 h-3.5" /> :
                   <AlertTriangle className="w-3.5 h-3.5" />}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40 text-xs font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Crawling...
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">{project.target}</p>
          </div>
        </div>

        {!isFinished && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-950/70 hover:text-red-300 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            {cancelling ? "Cancelling..." : "Cancel Run"}
          </button>
        )}
      </div>

      {/* Stat counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <CheckCircle2 className="w-4 h-4 text-[#2DD4BF]" />, label: "Collected", value: okCount.toLocaleString(), sub: "assets saved" },
          { icon: <HardDrive className="w-4 h-4 text-blue-400" />, label: "Data", value: fmtBytes(totalBytes), sub: "on disk" },
          { icon: <XCircle className="w-4 h-4 text-red-400" />, label: "Errors", value: errorCount.toLocaleString(), sub: "failed / blocked" },
          { icon: <Cpu className="w-4 h-4 text-purple-400" />, label: "Duplicates", value: dupCount.toLocaleString(), sub: "deduped by SHA-256" },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} className="rounded-xl border border-white/8 bg-[#12121A] px-4 py-3.5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
              {icon} {label}
            </div>
            <div className="text-2xl font-bold font-display text-zinc-100 leading-none">{value}</div>
            <div className="text-[10px] text-zinc-500 font-mono">{sub}</div>
          </div>
        ))}
      </div>

      {/* Indeterminate progress bar (while running) */}
      {!isFinished && (
        <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#2DD4BF] via-blue-400 to-[#2DD4BF] animate-[shimmer_2s_linear_infinite] w-1/3 rounded-full" />
        </div>
      )}

      {/* Summary (after completion) */}
      {summary && (
        <div className="rounded-xl border border-white/8 bg-[#12121A] p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-zinc-200 font-display">
            <Activity className="w-4 h-4 text-[#2DD4BF]" />
            Crawl Summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="text-zinc-500">Pages crawled</div>
              <div className="text-zinc-200">{summary.pages.toLocaleString()}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-500">Total bytes</div>
              <div className="text-zinc-200">{fmtBytes(summary.bytes)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-zinc-500">External origins</div>
              <div className="text-zinc-200">{summary.external_origins.length}</div>
            </div>
          </div>
          {summary.external_origins.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/6">
              <div className="text-[10px] text-zinc-500 mb-2 font-mono">External third-party origins (observed, not fetched)</div>
              <div className="flex flex-wrap gap-1.5">
                {summary.external_origins.map(o => (
                  <span key={o} className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-white/6 text-[10px] font-mono text-zinc-400">
                    <Link2 className="w-3 h-3" />
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource Table */}
      <div className="rounded-xl border border-white/8 bg-[#12121A] overflow-hidden flex flex-col" style={{ minHeight: 280 }}>
        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/6">
          <div className="flex items-center gap-1.5">
            {(["all", "ok", "error", "skipped"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer
                  ${filter === f
                    ? "bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "ok" && ` (${okCount})`}
                {f === "error" && ` (${errorCount})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Download className="w-3.5 h-3.5" />
            {filteredResources.length} items
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-white/4 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          <span>Type</span>
          <span>URL</span>
          <span>Status</span>
          <span className="hidden sm:block">Size</span>
          <span className="hidden md:block">SHA-256</span>
        </div>

        {/* Rows */}
        <div ref={tableRef} className="flex-1 overflow-y-auto max-h-80">
          {filteredResources.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-mono">
              {status === "running" ? "Waiting for resources..." : "No resources in this filter."}
            </div>
          ) : (
            filteredResources.map((r, i) => (
              <div
                key={`${r.url}-${i}`}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 items-center px-4 py-2 border-b border-white/4 hover:bg-white/[0.02] group transition-colors"
              >
                <span className="flex items-center">{mimeIcon(r.mime)}</span>
                <span className="font-mono text-[11px] text-zinc-300 truncate max-w-xs" title={r.url}>
                  {r.url.replace(/^https?:\/\/[^/]+/, "")}
                </span>
                <span>{statusBadge(r.status, r.http_status)}</span>
                <span className="hidden sm:block text-[10px] font-mono text-zinc-500">
                  {r.bytes !== undefined ? fmtBytes(r.bytes) : "—"}
                </span>
                <span className="hidden md:block text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {r.sha256 ? r.sha256.slice(0, 8) + "…" : "—"}
                </span>
              </div>
            ))
          )}
          {/* Auto-scroll anchor */}
          <div ref={tableRef as any} />
        </div>
      </div>

      {/* Expandable event log */}
      <div className="rounded-xl border border-white/8 bg-[#0E0E14] overflow-hidden">
        <button
          onClick={() => setShowLog(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>Live Event Log</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{events.length}</span>
            {!isFinished && <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />}
          </div>
          {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLog && (
          <div className="border-t border-white/6 max-h-56 overflow-y-auto bg-[#080810]">
            {events.length === 0 ? (
              <div className="px-4 py-6 text-zinc-600 text-xs font-mono text-center">No events yet...</div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className="px-4 py-1.5 font-mono text-[10px] border-b border-white/4 hover:bg-white/[0.02] flex items-start gap-2">
                  <span className={`shrink-0 ${
                    ev.type === "resource" && (ev as ResourceEvent).status === "ok" ? "text-[#2DD4BF]" :
                    ev.type === "error" ? "text-red-400" :
                    ev.type === "summary" ? "text-blue-400" :
                    ev.type === "end" ? "text-orange-400" :
                    "text-zinc-500"
                  }`}>[{ev.type}]</span>
                  <span className="text-zinc-400 break-all">
                    {ev.type === "resource"
                      ? `${(ev as ResourceEvent).status.toUpperCase()} — ${(ev as ResourceEvent).url}`
                      : ev.type === "error"
                      ? `${(ev as ErrorEvent).error}`
                      : ev.type === "summary"
                      ? `pages=${(ev as SummaryEvent).pages} bytes=${fmtBytes((ev as SummaryEvent).bytes)}`
                      : ev.type === "end"
                      ? `status=${(ev as EndEvent).status}`
                      : JSON.stringify(ev)}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* Intelligence: DNS + RDAP — auto-fetch on mount */}
      <div className="space-y-3 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 px-0.5">
          <span className="w-3 h-3 rounded-full bg-[#2DD4BF]/30 border border-[#2DD4BF]/40 inline-block" />
          <span className="uppercase tracking-wider">Passive Intelligence</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600">GET-only · observed data only</span>
        </div>
        <DnsPanel host={project.target.replace(/^https?:\/\//, "").split("/")[0].split("?")[0]} />
        <RdapPanel host={project.target.replace(/^https?:\/\//, "").split("/")[0].split("?")[0]} />
      </div>
    </div>
  );
}
