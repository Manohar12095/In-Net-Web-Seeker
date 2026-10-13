import { useState } from "react";
import { api } from "@/lib/api";
import {
  Wrench, X, Shield, Globe, Lock, Hash, Loader2, Copy, Server
} from "lucide-react";
import { Parsed } from "../home/useTargetValidation";

interface StandaloneToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StandaloneToolsModal({ isOpen, onClose }: StandaloneToolsModalProps) {
  const [activeTool, setActiveTool] = useState<"validator" | "dns" | "tls" | "headers" | "hasher">("validator");

  // State for Validator
  const [valInput, setValInput] = useState("");
  const [valResult, setValResult] = useState<Parsed | null>(null);
  const [valLoading, setValLoading] = useState(false);

  // State for DNS
  const [dnsInput, setDnsInput] = useState("");
  const [dnsResult, setDnsResult] = useState<any>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  // State for TLS
  const [tlsInput, setTlsInput] = useState("");
  const [tlsResult, setTlsResult] = useState<any>(null);
  const [tlsLoading, setTlsLoading] = useState(false);

  // State for Headers
  const [headerInput, setHeaderInput] = useState("");
  const [headerResult, setHeaderResult] = useState<any>(null);
  const [headerLoading, setHeaderLoading] = useState(false);

  // State for Hasher
  const [hashInput, setHashInput] = useState("");
  const [hashOutput, setHashOutput] = useState("");

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!valInput.trim()) return;
    setValLoading(true);
    try {
      const res = await api<Parsed>(`/api/targets/validate?input=${encodeURIComponent(valInput)}`);
      setValResult(res);
    } catch {
      setValResult(null);
    } finally {
      setValLoading(false);
    }
  };

  const handleDns = async () => {
    if (!dnsInput.trim()) return;
    setDnsLoading(true);
    try {
      const res = await api(`/api/intelligence/dns?host=${encodeURIComponent(dnsInput)}`);
      setDnsResult(res);
    } catch (e: any) {
      setDnsResult({ error: String(e) });
    } finally {
      setDnsLoading(false);
    }
  };

  const handleTls = async () => {
    if (!tlsInput.trim()) return;
    setTlsLoading(true);
    try {
      const res = await api(`/api/intelligence/tls?host=${encodeURIComponent(tlsInput)}`);
      setTlsResult(res);
    } catch (e: any) {
      setTlsResult({ error: String(e) });
    } finally {
      setTlsLoading(false);
    }
  };

  const handleHeaders = async () => {
    if (!headerInput.trim()) return;
    setHeaderLoading(true);
    try {
      const res = await api(`/api/intelligence/headers?target=${encodeURIComponent(headerInput)}`);
      setHeaderResult(res);
    } catch (e: any) {
      setHeaderResult({ error: String(e) });
    } finally {
      setHeaderLoading(false);
    }
  };

  const handleComputeHash = async () => {
    if (!hashInput) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    const hex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
    setHashOutput(hex);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0E0E14] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#2DD4BF]" />
            <h3 className="font-mono text-sm font-bold text-zinc-100">Standalone Intelligence Utilities</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tool Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-1.5 gap-1 text-xs font-mono overflow-x-auto">
          {[
            { id: "validator", label: "Target Validator", icon: Shield },
            { id: "dns", label: "DNS Lookup", icon: Server },
            { id: "tls", label: "TLS Inspector", icon: Lock },
            { id: "headers", label: "Header Audit", icon: Globe },
            { id: "hasher", label: "SHA-256 Hasher", icon: Hash },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id as any)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTool === t.id
                    ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tool Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-zinc-300">
          {/* Validator */}
          {activeTool === "validator" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-[11px]">
                Validates URLs, hostnames, domains, and IP addresses with zero outbound network requests.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. https://example.com:8443, 8.8.8.8, ::1"
                  value={valInput}
                  onChange={e => setValInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleValidate()}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#2DD4BF]"
                />
                <button
                  onClick={handleValidate}
                  disabled={valLoading}
                  className="px-4 py-2 bg-[#2DD4BF] text-zinc-950 font-bold rounded-lg hover:bg-[#2DD4BF]/90"
                >
                  Validate
                </button>
              </div>

              {valResult && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Kind:</span>
                    <span className="font-bold uppercase text-[#2DD4BF]">{valResult.kind}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Normalized:</span>
                    <span className="text-zinc-200 break-all">{valResult.normalized}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Host:</span>
                    <span className="text-zinc-200">{valResult.host}</span>
                  </div>
                  {valResult.errors?.length > 0 && (
                    <div className="text-red-400">
                      <strong>Errors:</strong> {valResult.errors.join(", ")}
                    </div>
                  )}
                  {valResult.warnings?.length > 0 && (
                    <div className="text-yellow-400">
                      <strong>Warnings:</strong> {valResult.warnings.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DNS */}
          {activeTool === "dns" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-[11px]">
                Query standard DNS records (A, AAAA, MX, NS, TXT, SOA, CAA) via asynchronous resolver.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. google.com or cloudflare.com"
                  value={dnsInput}
                  onChange={e => setDnsInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleDns()}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#2DD4BF]"
                />
                <button
                  onClick={handleDns}
                  disabled={dnsLoading}
                  className="px-4 py-2 bg-[#2DD4BF] text-zinc-950 font-bold rounded-lg hover:bg-[#2DD4BF]/90"
                >
                  Lookup
                </button>
              </div>

              {dnsLoading && (
                <div className="p-6 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                  Querying DNS records...
                </div>
              )}

              {dnsResult && !dnsLoading && (
                <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 overflow-auto max-h-64">
                  {JSON.stringify(dnsResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* TLS */}
          {activeTool === "tls" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-[11px]">
                Inspects X.509 certificate parameters, validity window, SANs, and cipher suite on port 443.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. github.com"
                  value={tlsInput}
                  onChange={e => setTlsInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTls()}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#2DD4BF]"
                />
                <button
                  onClick={handleTls}
                  disabled={tlsLoading}
                  className="px-4 py-2 bg-[#2DD4BF] text-zinc-950 font-bold rounded-lg hover:bg-[#2DD4BF]/90"
                >
                  Inspect
                </button>
              </div>

              {tlsLoading && (
                <div className="p-6 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                  Connecting and inspecting certificate...
                </div>
              )}

              {tlsResult && !tlsLoading && (
                <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 overflow-auto max-h-64">
                  {JSON.stringify(tlsResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Headers */}
          {activeTool === "headers" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-[11px]">
                Passive security header audit with A-F grading and remediation recommendations.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. https://example.com"
                  value={headerInput}
                  onChange={e => setHeaderInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleHeaders()}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#2DD4BF]"
                />
                <button
                  onClick={handleHeaders}
                  disabled={headerLoading}
                  className="px-4 py-2 bg-[#2DD4BF] text-zinc-950 font-bold rounded-lg hover:bg-[#2DD4BF]/90"
                >
                  Audit
                </button>
              </div>

              {headerLoading && (
                <div className="p-6 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                  Probing headers...
                </div>
              )}

              {headerResult && !headerLoading && (
                <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 overflow-auto max-h-64">
                  {JSON.stringify(headerResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Hasher */}
          {activeTool === "hasher" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-[11px]">
                Instant client-side SHA-256 calculator for verifying digests and content hashes.
              </p>
              <textarea
                placeholder="Paste text here to compute its cryptographic hash..."
                value={hashInput}
                onChange={e => setHashInput(e.target.value)}
                rows={4}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:outline-none focus:border-[#2DD4BF]"
              />
              <button
                onClick={handleComputeHash}
                className="px-4 py-2 bg-[#2DD4BF] text-zinc-950 font-bold rounded-lg hover:bg-[#2DD4BF]/90"
              >
                Compute SHA-256
              </button>

              {hashOutput && (
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">SHA-256 Hash:</span>
                  <div className="flex justify-between items-center text-teal-400 break-all">
                    <span>{hashOutput}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(hashOutput)}
                      className="p-1 hover:text-zinc-100"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
