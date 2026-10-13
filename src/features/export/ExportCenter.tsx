import { useState } from "react";
import { api, apiDownload } from "@/lib/api";
import {
  Download, ShieldCheck, AlertTriangle,
  FileText, Printer, FileArchive, Loader2
} from "lucide-react";

interface ExportCenterProps {
  projectId: string;
  projectName: string;
  target: string;
}

interface ExportResult {
  export_id: string;
  files: number;
  missing: number;
  archive_bytes: number;
}

interface VerifyResult {
  valid: boolean;
  problems: string[];
  export_id: string;
  size: number;
}

function fmtBytes(b: number): string {
  if (!b || b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function ExportCenter({ projectId, projectName, target }: ExportCenterProps) {
  const [exporting, setExporting] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [showReport, setShowReport] = useState(false);

  const downloadArchive = async (exportId: string) => {
    const filename = `web-seeker-${projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.zip`;
    try {
      await apiDownload(`/api/exports/${exportId}/download`, filename);
    } catch {
      // Fallback: direct window download
      window.location.href = `http://127.0.0.1:8765/api/exports/${exportId}/download`;
    }
  };

  const handleCreateExport = async () => {
    setExporting(true);
    setVerifyResult(null);
    try {
      const res = await api<ExportResult>(`/api/projects/${projectId}/exports`, { method: "POST" });
      setLatestExport(res);

      // Trigger automatic safe authenticated download
      await downloadArchive(res.export_id);

      // Auto-run cryptographic verification
      handleVerify(res.export_id);
    } catch (e: any) {
      alert("Failed to create export archive: " + (e.message || String(e)));
    } finally {
      setExporting(false);
    }
  };

  const handleVerify = async (exportId: string) => {
    setVerifying(true);
    try {
      const res = await api<VerifyResult>(`/api/exports/${exportId}/verify`);
      setVerifyResult(res);
    } catch (e: any) {
      setVerifyResult({
        valid: false,
        problems: ["Failed to verify archive: " + (e.message || String(e))],
        export_id: exportId,
        size: 0,
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <FileArchive className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-base font-mono font-bold text-zinc-100">
            Cryptographic ZIP Bundles & Investigation Reports
          </h2>
        </div>
      </div>

      {/* Main Download Card */}
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-mono font-bold text-zinc-100">
              Download Everything (Standalone ZIP)
            </h3>
            <p className="text-xs font-mono text-zinc-400 max-w-xl">
              Packages all collected assets, directory structure, <code className="text-[#2DD4BF]">manifest.json</code>, and <code className="text-[#2DD4BF]">checksums.sha256</code> into an offline, self-verifying archive.
            </p>
          </div>

          <button
            onClick={handleCreateExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#2DD4BF]/90 text-zinc-950 font-mono text-xs font-bold transition-all shadow-lg shadow-[#2DD4BF]/10 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Streaming Archive...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Build & Download ZIP
              </>
            )}
          </button>
        </div>

        {/* Verification Status */}
        {latestExport && (
          <div className="pt-4 border-t border-zinc-850 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Files Included</span>
                <p className="text-zinc-200 font-bold text-sm mt-0.5">{latestExport.files}</p>
              </div>
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Archive Size</span>
                <p className="text-zinc-200 font-bold text-sm mt-0.5">{fmtBytes(latestExport.archive_bytes)}</p>
              </div>
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Export ID</span>
                <p className="text-[#2DD4BF] font-bold text-sm mt-0.5 truncate">{latestExport.export_id.slice(0, 12)}…</p>
              </div>
            </div>

            {/* Cryptographic Verification Card */}
            {verifying ? (
              <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center gap-3 text-zinc-400">
                <Loader2 className="w-4 h-4 text-[#2DD4BF] animate-spin" />
                Verifying all archive entries against SHA-256 manifest...
              </div>
            ) : verifyResult ? (
              <div className={`p-4 rounded-xl border ${
                verifyResult.valid
                  ? "bg-teal-950/30 border-teal-800/60 text-[#2DD4BF]"
                  : "bg-red-950/30 border-red-800/60 text-red-400"
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {verifyResult.valid ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" />
                      Cryptographic Verification Passed: Authentic & Untampered
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Verification Failed
                    </>
                  )}
                </div>
                {verifyResult.valid ? (
                  <p className="text-[11px] text-teal-300/80 mt-1">
                    Every file was extracted and streamed to recalculate its SHA-256 digest. 100% of checksums matched manifest.json.
                  </p>
                ) : (
                  <ul className="list-disc list-inside text-[11px] mt-1 space-y-0.5">
                    {verifyResult.problems.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {/* Re-download Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => downloadArchive(latestExport.export_id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800 text-[#2DD4BF] font-mono text-xs font-semibold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Archive (.ZIP)
              </button>
              <a
                href={`http://127.0.0.1:8765/api/exports/${latestExport.export_id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-zinc-200 underline font-mono ml-1"
              >
                Direct Browser Link
              </a>
            </div>
          </div>
        )}
      </div>

      {/* HTML Executive Report Card */}
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-mono font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Executive Investigation Report
            </h3>
            <p className="text-xs font-mono text-zinc-400 max-w-xl">
              Generates a self-contained, printable HTML report summarizing findings, target parameters, security posture, and asset inventory.
            </p>
          </div>

          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-mono text-xs font-semibold transition-all"
          >
            {showReport ? "Hide Report Preview" : "Preview Report"}
          </button>
        </div>

        {/* Report Preview */}
        {showReport && (
          <div className="pt-4 border-t border-zinc-800 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>

            <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6 font-mono text-xs text-zinc-200">
              <div className="border-b border-zinc-800 pb-4">
                <span className="text-[10px] text-[#2DD4BF] font-bold uppercase tracking-wider">In Net Web Seeker Report</span>
                <h2 className="text-xl font-bold text-zinc-100 mt-1">{projectName}</h2>
                <p className="text-zinc-400 text-xs">Target: {target}</p>
                <p className="text-zinc-500 text-[10px] mt-1">Generated: {new Date().toUTCString()}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-300">Executive Summary</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  This investigation was performed using In Net Web Seeker in strict read-only mode via SSRF-guarded HTTP streams. All gathered evidence is cryptographically indexed and content-addressed by SHA-256.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Project ID:</span>
                  <span className="text-zinc-200">{projectId}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Collection Policy:</span>
                  <span className="text-teal-400">Authorized Use Confirmed</span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 text-center text-zinc-600 text-[10px]">
                Powered by IN NET Creations · Created by S. Manohar · In Net Web Seeker
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
