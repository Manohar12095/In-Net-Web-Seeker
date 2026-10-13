import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Globe, Server, Mail, Shield, Hash, Clock, Building,
  ChevronDown, ChevronUp, AlertCircle, Loader2,
} from "lucide-react";

// ─── DNS Panel ────────────────────────────────────────────────────────────────

interface DnsResult {
  host: string;
  queried_at: string;
  source: "observed" | "unavailable";
  records?: Record<string, string[]>;
  unavailable?: string[];
  error?: string;
}

const DNS_ICONS: Record<string, React.ReactElement> = {
  A: <Server className="w-3.5 h-3.5 text-teal-400" />,
  AAAA: <Server className="w-3.5 h-3.5 text-blue-400" />,
  CNAME: <Globe className="w-3.5 h-3.5 text-purple-400" />,
  MX: <Mail className="w-3.5 h-3.5 text-pink-400" />,
  NS: <Globe className="w-3.5 h-3.5 text-cyan-400" />,
  TXT: <Hash className="w-3.5 h-3.5 text-yellow-400" />,
  SOA: <Clock className="w-3.5 h-3.5 text-orange-400" />,
  CAA: <Shield className="w-3.5 h-3.5 text-green-400" />,
};

export function DnsPanel({ host }: { host: string }) {
  const [data, setData] = useState<DnsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!host) return;
    setLoading(true);
    api<DnsResult>(`/api/intelligence/dns?host=${encodeURIComponent(host)}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [host]);

  return (
    <div className="rounded-xl border border-white/8 bg-[#12121A] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Server className="w-4 h-4 text-[#2DD4BF]" />
          <span className="text-sm font-semibold text-zinc-200 font-display">DNS Records</span>
          {data?.source === "observed" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40">observed</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/6 px-4 pb-4 pt-3 space-y-2.5">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Querying DNS servers...
            </div>
          ) : !data || data.error ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono py-2">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              {data?.error ?? "DNS lookup failed"}
            </div>
          ) : Object.keys(data.records ?? {}).length === 0 ? (
            <div className="text-xs font-mono text-zinc-500 py-2">No DNS records returned — all unavailable.</div>
          ) : (
            Object.entries(data.records ?? {}).map(([type, values]) => (
              <div key={type} className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {DNS_ICONS[type] ?? <Globe className="w-3.5 h-3.5" />}
                  {type}
                </div>
                <div className="pl-5 space-y-0.5">
                  {values.map((v, i) => (
                    <div key={i} className="text-xs font-mono text-zinc-300 break-all">{v}</div>
                  ))}
                </div>
              </div>
            ))
          )}
          {data && !loading && (data.unavailable ?? []).length > 0 && (
            <div className="pt-2 border-t border-white/4 text-[10px] font-mono text-zinc-600">
              unavailable: {data.unavailable!.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RDAP Panel ───────────────────────────────────────────────────────────────

interface RdapResult {
  host: string;
  queried_at?: string;
  source: "observed" | "unavailable";
  handle?: string;
  status?: string[];
  registered?: string;
  last_changed?: string;
  expiry?: string;
  nameservers?: string[];
  entities?: Array<{ roles: string[]; name?: string; org?: string; email?: string }>;
  error?: string;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

export function RdapPanel({ host }: { host: string }) {
  const [data, setData] = useState<RdapResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!host) return;
    setLoading(true);
    api<RdapResult>(`/api/intelligence/rdap?host=${encodeURIComponent(host)}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [host]);

  return (
    <div className="rounded-xl border border-white/8 bg-[#12121A] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Building className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-zinc-200 font-display">RDAP Registration</span>
          {data?.source === "observed" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-800/40">observed</span>
          )}
          {data?.source === "unavailable" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-500">unavailable</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/6 px-4 pb-4 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Querying RDAP registry...
            </div>
          ) : !data || data.error ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono py-2">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              {data?.error ?? "RDAP lookup failed"}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Dates row */}
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                {[
                  { label: "Registered", value: fmtDate(data.registered) },
                  { label: "Last changed", value: fmtDate(data.last_changed) },
                  { label: "Expires", value: fmtDate(data.expiry) },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-0.5">
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</div>
                    <div className="text-zinc-300">{value}</div>
                  </div>
                ))}
              </div>

              {/* Status */}
              {(data.status ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.status!.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded bg-zinc-800 border border-white/6 text-[10px] font-mono text-zinc-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nameservers */}
              {(data.nameservers ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Nameservers</div>
                  <div className="space-y-0.5">
                    {data.nameservers!.map(ns => (
                      <div key={ns} className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        {ns}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities */}
              {(data.entities ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Contacts</div>
                  <div className="space-y-2">
                    {data.entities!.map((e, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/6 text-xs font-mono space-y-0.5">
                        <div className="flex flex-wrap gap-1">
                          {e.roles.map(r => (
                            <span key={r} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px]">{r}</span>
                          ))}
                        </div>
                        {e.name && <div className="text-zinc-300">{e.name}</div>}
                        {e.org && <div className="text-zinc-400">{e.org}</div>}
                        {e.email && <div className="text-zinc-500">{e.email}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Handle */}
              {data.handle && (
                <div className="text-[10px] font-mono text-zinc-600">Handle: {data.handle}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
