import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Globe, Shield, Lock, Server, Cpu, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw
} from "lucide-react";
import { DnsPanel, RdapPanel } from "../collection/IntelligencePanels";

interface IntelligenceDashboardProps {
  host: string;
  targetUrl: string;
}

interface TlsInfo {
  status: string;
  source: string;
  tls_version?: string;
  cipher_suite?: string;
  fingerprint_sha256?: string;
  subject?: string;
  common_name?: string;
  issuer?: string;
  issuer_org?: string;
  not_before?: string;
  not_after?: string;
  days_remaining?: number;
  is_expired?: boolean;
  sans?: string[];
  serial_number?: string;
  reason?: string;
}

interface HeaderFinding {
  header: string;
  status: "pass" | "missing";
  value?: string | null;
  description: string;
  recommendation: string;
  weight: number;
}

interface HeaderAudit {
  status: string;
  source: string;
  grade?: string;
  score?: number;
  max_score?: number;
  headers?: HeaderFinding[];
  cookies?: Array<{ name: string; secure: boolean; httponly: boolean; samesite: string }>;
  cors?: { allow_origin?: string; is_wildcard: boolean };
  disclosures?: Array<{ header: string; value: string }>;
  reason?: string;
}

interface TechItem {
  name: string;
  category: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  version?: string;
}

interface TechData {
  status: string;
  count?: number;
  technologies?: TechItem[];
  reason?: string;
}

export function IntelligenceDashboard({ host, targetUrl }: IntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dns" | "tls" | "headers" | "tech" | "rdap">("headers");

  // State
  const [tlsData, setTlsData] = useState<TlsInfo | null>(null);
  const [headerData, setHeaderData] = useState<HeaderAudit | null>(null);
  const [techData, setTechData] = useState<TechData | null>(null);

  const [loadingTls, setLoadingTls] = useState(false);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [loadingTech, setLoadingTech] = useState(false);

  // Fetch TLS
  const loadTls = () => {
    if (!host) return;
    setLoadingTls(true);
    api<TlsInfo>(`/api/intelligence/tls?host=${encodeURIComponent(host)}`)
      .then(setTlsData)
      .catch(() => setTlsData({ status: "unavailable", source: "unavailable", reason: "Connection failed" }))
      .finally(() => setLoadingTls(false));
  };

  // Fetch Headers
  const loadHeaders = () => {
    if (!targetUrl) return;
    setLoadingHeaders(true);
    api<HeaderAudit>(`/api/intelligence/headers?target=${encodeURIComponent(targetUrl)}`)
      .then(setHeaderData)
      .catch(() => setHeaderData({ status: "unavailable", source: "unavailable", reason: "Audit failed" }))
      .finally(() => setLoadingHeaders(false));
  };

  // Fetch Tech
  const loadTech = () => {
    if (!targetUrl) return;
    setLoadingTech(true);
    api<TechData>(`/api/intelligence/tech?target=${encodeURIComponent(targetUrl)}`)
      .then(setTechData)
      .catch(() => setTechData({ status: "unavailable", technologies: [] }))
      .finally(() => setLoadingTech(false));
  };

  useEffect(() => {
    loadTls();
    loadHeaders();
    loadTech();
  }, [host, targetUrl]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-zinc-200">
      {/* Tab Strip */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-base font-mono font-bold text-zinc-100">
            Passive Intelligence & Security Audit
          </h2>
        </div>

        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab("headers")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "headers" ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Security Headers
            {headerData?.grade && (
              <span className={`px-1 rounded text-[10px] ${
                headerData.grade.startsWith("A") ? "bg-teal-950 text-[#2DD4BF]" :
                headerData.grade === "B" ? "bg-blue-950 text-blue-400" :
                "bg-red-950 text-red-400"
              }`}>
                {headerData.grade}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tls")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "tls" ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            TLS Certificate
          </button>

          <button
            onClick={() => setActiveTab("tech")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "tech" ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Technologies ({techData?.count || 0})
          </button>

          <button
            onClick={() => setActiveTab("dns")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "dns" ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            DNS Records
          </button>

          <button
            onClick={() => setActiveTab("rdap")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "rdap" ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            RDAP Registration
          </button>
        </div>
      </div>

      {/* Tab: Security Headers */}
      {activeTab === "headers" && (
        <div className="space-y-6">
          {loadingHeaders ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
              Auditing HTTP response headers, cookies, and CORS policies...
            </div>
          ) : headerData?.status === "unavailable" ? (
            <div className="p-6 bg-zinc-950/70 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" />
                Target Unreachable for Header Audit
              </div>
              <p className="text-zinc-500">{headerData.reason || "The target server did not respond to passive probing."}</p>
            </div>
          ) : headerData ? (
            <>
              {/* Scorecard Hero */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-mono text-3xl font-black border ${
                    headerData.grade?.startsWith("A") ? "bg-teal-950/60 border-teal-800 text-[#2DD4BF]" :
                    headerData.grade === "B" ? "bg-blue-950/60 border-blue-800 text-blue-400" :
                    headerData.grade === "C" ? "bg-yellow-950/60 border-yellow-800 text-yellow-400" :
                    "bg-red-950/60 border-red-800 text-red-400"
                  }`}>
                    {headerData.grade}
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-zinc-100">
                      Security Header Posture: Grade {headerData.grade}
                    </h3>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      Score: <strong className="text-zinc-200">{headerData.score}</strong> / {headerData.max_score} points earned
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    Source: <strong className="text-zinc-200">observed</strong>
                  </span>
                  <button
                    onClick={loadHeaders}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-400 hover:text-[#2DD4BF]"
                    title="Re-run audit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Security Headers Table */}
              <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 overflow-hidden">
                <div className="p-3.5 bg-zinc-900/60 border-b border-zinc-800 font-mono text-xs font-semibold text-zinc-300">
                  Evaluated Headers Checklist
                </div>
                <div className="divide-y divide-zinc-850">
                  {headerData.headers?.map(h => (
                    <div key={h.header} className="p-3.5 hover:bg-zinc-900/40 font-mono text-xs space-y-1.5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {h.status === "pass" ? (
                            <CheckCircle2 className="w-4 h-4 text-[#2DD4BF]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="font-bold text-zinc-200">{h.header}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          h.status === "pass" ? "bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40" : "bg-red-950/60 text-red-400 border border-red-800/40"
                        }`}>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px]">{h.description}</p>
                      {h.value ? (
                        <div className="p-1.5 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-300 break-all">
                          {h.value}
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500">
                          Recommended value: <code className="text-teal-400">{h.recommendation}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cookies & Disclosures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cookies */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-zinc-200 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    Observed Set-Cookie Flags ({headerData.cookies?.length || 0})
                  </h4>
                  {headerData.cookies?.length === 0 ? (
                    <p className="text-zinc-500 text-[11px]">No Set-Cookie headers in initial probe response.</p>
                  ) : (
                    <div className="space-y-2">
                      {headerData.cookies?.map((c, i) => (
                        <div key={i} className="p-2 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                          <span className="font-bold text-zinc-300">{c.name}</span>
                          <div className="flex gap-2 text-[10px]">
                            <span className={c.secure ? "text-teal-400" : "text-red-400"}>Secure: {c.secure ? "YES" : "NO"}</span>
                            <span className={c.httponly ? "text-teal-400" : "text-red-400"}>HttpOnly: {c.httponly ? "YES" : "NO"}</span>
                            <span className="text-zinc-400">SameSite: {c.samesite.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disclosures & CORS */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-zinc-200 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-yellow-400" />
                    Information Disclosures & CORS
                  </h4>
                  {headerData.disclosures?.length === 0 ? (
                    <p className="text-zinc-500 text-[11px]">No verbose server software headers disclosed.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {headerData.disclosures?.map((d, i) => (
                        <div key={i} className="p-2 bg-zinc-900 rounded border border-zinc-800 text-[11px] flex justify-between">
                          <span className="text-zinc-400">{d.header}:</span>
                          <span className="text-yellow-400 font-bold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800 text-[11px] space-y-1">
                    <span className="text-zinc-400">CORS Access-Control-Allow-Origin:</span>
                    <p className="text-zinc-200">
                      {headerData.cors?.allow_origin || "None declared"}
                      {headerData.cors?.is_wildcard && (
                        <span className="text-red-400 font-bold ml-2">(Wildcard * detected!)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Tab: TLS Certificate */}
      {activeTab === "tls" && (
        <div className="space-y-6">
          {loadingTls ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
              Performing TLS handshake and verifying certificate chain...
            </div>
          ) : tlsData?.status === "unavailable" ? (
            <div className="p-6 bg-zinc-950/70 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-yellow-400 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" />
                TLS Inspection Unavailable
              </div>
              <p className="text-zinc-500">{tlsData.reason || "Port 443 did not complete a TLS handshake."}</p>
            </div>
          ) : tlsData ? (
            <div className="space-y-4">
              {/* Header overview */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <Lock className="w-4 h-4 text-[#2DD4BF]" />
                    <h3 className="text-sm font-bold text-zinc-100">
                      {tlsData.common_name || host}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-teal-950 text-[#2DD4BF] border border-teal-800/40">
                      {tlsData.tls_version || "TLS"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    Issuer: <span className="text-zinc-200">{tlsData.issuer_org || tlsData.issuer}</span>
                  </p>
                </div>

                <div className="text-right font-mono">
                  <div className={`text-base font-bold ${
                    tlsData.is_expired ? "text-red-400" :
                    (tlsData.days_remaining || 0) < 30 ? "text-yellow-400" : "text-[#2DD4BF]"
                  }`}>
                    {tlsData.is_expired ? "EXPIRED" : `${tlsData.days_remaining} Days Left`}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Expires: {tlsData.not_after?.split("T")[0] || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Technical Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Certificate Parameters */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
                  <h4 className="font-bold text-zinc-200 border-b border-zinc-800 pb-2">Certificate Authority & Scope</h4>
                  <div className="flex justify-between text-zinc-400">
                    <span>Common Name</span>
                    <span className="text-zinc-200">{tlsData.common_name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Issuer</span>
                    <span className="text-zinc-200 truncate max-w-[220px]" title={tlsData.issuer}>{tlsData.issuer || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Valid From</span>
                    <span className="text-zinc-200">{tlsData.not_before?.split("T")[0] || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Valid Until</span>
                    <span className="text-zinc-200">{tlsData.not_after?.split("T")[0] || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Serial Number</span>
                    <span className="text-zinc-200 font-mono text-[10px]">{tlsData.serial_number || "—"}</span>
                  </div>
                </div>

                {/* Cryptographic Parameters */}
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
                  <h4 className="font-bold text-zinc-200 border-b border-zinc-800 pb-2">Cryptographic Parameters</h4>
                  <div className="flex justify-between text-zinc-400">
                    <span>Protocol</span>
                    <span className="text-[#2DD4BF]">{tlsData.tls_version || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Cipher Suite</span>
                    <span className="text-zinc-200 text-[11px] break-all">{tlsData.cipher_suite || "—"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>SHA-256 Fingerprint</span>
                    <span className="text-zinc-300 text-[10px] truncate max-w-[180px]" title={tlsData.fingerprint_sha256}>
                      {tlsData.fingerprint_sha256}
                    </span>
                  </div>
                </div>
              </div>

              {/* SANs (Subject Alternative Names) */}
              {tlsData.sans && tlsData.sans.length > 0 && (
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2 font-mono text-xs">
                  <h4 className="font-bold text-zinc-200">
                    Subject Alternative Names (SANs) ({tlsData.sans.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tlsData.sans.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Technologies */}
      {activeTab === "tech" && (
        <div className="space-y-4">
          {loadingTech ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
              Scanning passive signatures across servers, frameworks, and CMS...
            </div>
          ) : techData?.technologies?.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">
              No known technology signatures detected in initial probe.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {techData?.technologies?.map((t, idx) => (
                <div key={idx} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl font-mono text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm">{t.name}</h4>
                      <span className="text-[10px] text-zinc-500">{t.category}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                      t.confidence === "high" ? "bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40" : "bg-zinc-850 text-zinc-400"
                    }`}>
                      {t.confidence} conf.
                    </span>
                  </div>
                  {t.version && (
                    <div className="text-[11px] text-teal-400">
                      Version: {t.version}
                    </div>
                  )}
                  <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 text-[10px] text-zinc-400 break-all leading-normal">
                    {t.evidence}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: DNS */}
      {activeTab === "dns" && (
        <div className="space-y-4">
          <DnsPanel host={host} />
        </div>
      )}

      {/* Tab: RDAP */}
      {activeTab === "rdap" && (
        <div className="space-y-4">
          <RdapPanel host={host} />
        </div>
      )}
    </div>
  );
}
