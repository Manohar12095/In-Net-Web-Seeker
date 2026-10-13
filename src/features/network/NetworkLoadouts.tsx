import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Globe, Activity, Server, Layers, ExternalLink
} from "lucide-react";
import { ResourceItem } from "../assets/AssetExplorer";

interface NetworkLoadoutsProps {
  projectId: string;
  target: string;
  runId?: string;
}

function fmtBytes(b: number): string {
  if (!b || b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function NetworkLoadouts({ projectId, target, runId }: NetworkLoadoutsProps) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
    api<ResourceItem[]>(`/api/projects/${projectId}/all-resources${q}`)
      .then(r => setResources(r || []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [projectId, runId]);

  // Extract host from target
  const targetHost = useMemo(() => {
    try {
      const u = target.startsWith("http") ? new URL(target) : new URL("https://" + target);
      return u.hostname;
    } catch {
      return target;
    }
  }, [target]);

  // Group resources by origin/domain
  const originStats = useMemo(() => {
    const map = new Map<string, { requests: number; bytes: number; isFirstParty: boolean }>();

    for (const r of resources) {
      let host = "unknown";
      try {
        host = new URL(r.url).hostname;
      } catch {
        host = "unknown";
      }

      const isFirstParty = host === targetHost || host.endsWith("." + targetHost);
      const curr = map.get(host) || { requests: 0, bytes: 0, isFirstParty };
      curr.requests += 1;
      curr.bytes += r.size || 0;
      map.set(host, curr);
    }

    return Array.from(map.entries())
      .map(([domain, data]) => ({ domain, ...data }))
      .sort((a, b) => b.bytes - a.bytes);
  }, [resources, targetHost]);

  // First party vs Third party totals
  const firstPartyBytes = originStats.filter(o => o.isFirstParty).reduce((a, o) => a + o.bytes, 0);
  const thirdPartyBytes = originStats.filter(o => !o.isFirstParty).reduce((a, o) => a + o.bytes, 0);
  const totalBytes = firstPartyBytes + thirdPartyBytes || 1;

  const firstPartyReqs = originStats.filter(o => o.isFirstParty).reduce((a, o) => a + o.requests, 0);
  const thirdPartyReqs = originStats.filter(o => !o.isFirstParty).reduce((a, o) => a + o.requests, 0);

  // MIME categorization
  const mimeStats = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const r of resources) {
      const m = (r.mime || "other").split(";")[0].trim();
      const curr = map.get(m) || { count: 0, bytes: 0 };
      curr.count += 1;
      curr.bytes += r.size || 0;
      map.set(m, curr);
    }
    return Array.from(map.entries())
      .map(([mime, data]) => ({ mime, ...data }))
      .sort((a, b) => b.bytes - a.bytes);
  }, [resources]);

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        Calculating network loadouts and origin metrics...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Origins */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-2">
            <Globe className="w-4 h-4 text-[#2DD4BF]" />
            <span>Observed Domains</span>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {originStats.length}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">
            {originStats.filter(o => !o.isFirstParty).length} external third parties
          </p>
        </div>

        {/* First Party Bandwidth */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-2">
            <Server className="w-4 h-4 text-teal-400" />
            <span>1st-Party Payload</span>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {fmtBytes(firstPartyBytes)}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">
            {Math.round((firstPartyBytes / totalBytes) * 100)}% of total transfer
          </p>
        </div>

        {/* Third Party Bandwidth */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-2">
            <ExternalLink className="w-4 h-4 text-purple-400" />
            <span>3rd-Party Payload</span>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {fmtBytes(thirdPartyBytes)}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">
            {Math.round((thirdPartyBytes / totalBytes) * 100)}% of total transfer
          </p>
        </div>

        {/* Request Ratio */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono mb-2">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span>Total Requests</span>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {resources.length}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">
            {firstPartyReqs} local · {thirdPartyReqs} external
          </p>
        </div>
      </div>

      {/* Origin Split Bar */}
      <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
        <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
          <span>Payload Distribution</span>
          <span>
            1st Party: <strong className="text-teal-400">{Math.round((firstPartyBytes / totalBytes) * 100)}%</strong> vs 3rd Party: <strong className="text-purple-400">{Math.round((thirdPartyBytes / totalBytes) * 100)}%</strong>
          </span>
        </div>
        <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${(firstPartyBytes / totalBytes) * 100}%` }}
            className="bg-[#2DD4BF] h-full"
            title="1st Party Payload"
          />
          <div
            style={{ width: `${(thirdPartyBytes / totalBytes) * 100}%` }}
            className="bg-purple-500 h-full"
            title="3rd Party Payload"
          />
        </div>
      </div>

      {/* Origins Breakdown Table */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#2DD4BF]" />
            <h3 className="font-mono text-sm font-semibold text-zinc-100">
              Discovered Origins Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Ranked by total bandwidth
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Origin / Domain</th>
                <th className="py-2.5 px-4 w-32">Classification</th>
                <th className="py-2.5 px-4 w-28 text-right">Requests</th>
                <th className="py-2.5 px-4 w-32 text-right">Transfer</th>
                <th className="py-2.5 px-4 w-40">Bandwidth Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {originStats.map(o => {
                const pct = Math.round((o.bytes / totalBytes) * 100);
                return (
                  <tr key={o.domain} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-zinc-200">
                      {o.domain}
                    </td>
                    <td className="py-2.5 px-4">
                      {o.isFirstParty ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40">
                          1st-Party
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          3rd-Party Origin
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300">
                      {o.requests}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300 font-bold">
                      {fmtBytes(o.bytes)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full ${o.isFirstParty ? "bg-[#2DD4BF]" : "bg-purple-500"}`}
                          />
                        </div>
                        <span className="w-8 text-[11px] text-zinc-400">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Content-Type / MIME Distribution */}
      <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2DD4BF]" />
          <h3 className="font-mono text-sm font-semibold text-zinc-100">
            MIME & Content-Type Distribution
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mimeStats.map(m => (
            <div key={m.mime} className="p-3 bg-zinc-900/60 border border-zinc-800/70 rounded-lg font-mono text-xs space-y-1">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-semibold truncate max-w-[180px]">{m.mime}</span>
                <span className="text-[#2DD4BF]">{fmtBytes(m.bytes)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-zinc-500">
                <span>{m.count} resources</span>
                <span>{Math.round((m.bytes / totalBytes) * 100)}% payload</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
