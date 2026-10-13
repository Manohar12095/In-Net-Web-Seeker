import { useState, useMemo, useEffect } from "react";
import { api, apiText, apiDownload } from "@/lib/api";
import DOMPurify from "dompurify";
import {
  Search, FileText, Code, Image, Layers, Globe,
  Copy, ExternalLink, FolderOpen, RefreshCw, Eye, X, Download
} from "lucide-react";

export interface ResourceItem {
  id: number;
  run_id: string;
  url: string;
  final_url?: string;
  referrer?: string;
  depth: number;
  status: "ok" | "http_error" | "skipped" | "blocked" | "too_large" | "error" | string;
  http_status?: number;
  mime?: string;
  detected?: string;
  size: number;
  sha256?: string;
  error?: string;
}

interface AssetExplorerProps {
  projectId: string;
  runId?: string;
}

function fmtBytes(b: number): string {
  if (!b || b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function getMimeCategory(mime?: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("html")) return "pages";
  if (m.includes("css")) return "css";
  if (m.includes("javascript")) return "javascript";
  if (m.includes("image")) return "images";
  if (m.includes("font") || m.includes("woff")) return "fonts";
  if (m.includes("video") || m.includes("audio")) return "media";
  if (m.includes("json") || m.includes("xml")) return "data";
  if (m.includes("pdf")) return "documents";
  return "other";
}

function MimeIcon({ mime }: { mime?: string }) {
  const m = (mime || "").toLowerCase();
  if (m.includes("html")) return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  if (m.includes("css")) return <Code className="w-3.5 h-3.5 text-purple-400" />;
  if (m.includes("javascript")) return <Code className="w-3.5 h-3.5 text-yellow-400" />;
  if (m.includes("image")) return <Image className="w-3.5 h-3.5 text-pink-400" />;
  if (m.includes("font") || m.includes("woff")) return <Layers className="w-3.5 h-3.5 text-orange-400" />;
  return <Globe className="w-3.5 h-3.5 text-zinc-400" />;
}

export function AssetExplorer({ projectId, runId }: AssetExplorerProps) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<ResourceItem | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch resources from API
  const fetchResources = async () => {
    setLoading(true);
    try {
      const q = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
      const data = await api<ResourceItem[]>(`/api/projects/${projectId}/all-resources${q}`);
      setResources(data || []);
    } catch {
      // Fallback to ok resources
      try {
        const okData = await api<ResourceItem[]>(`/api/projects/${projectId}/resources`);
        setResources(okData || []);
      } catch {
        setResources([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [projectId, runId]);

  // Load preview content when an asset is selected
  useEffect(() => {
    if (!selectedAsset) {
      setPreviewContent(null);
      return;
    }
    const mime = (selectedAsset.mime || "").toLowerCase();
    const isTextual = mime.includes("html") || mime.includes("css") || mime.includes("javascript") ||
      mime.includes("json") || mime.includes("xml") || mime.includes("text") || mime.includes("svg");

    if (isTextual && selectedAsset.sha256) {
      setPreviewLoading(true);
      apiText(`/api/projects/${projectId}/resources/${selectedAsset.id}/content`)
        .then(txt => setPreviewContent(txt))
        .catch(() => setPreviewContent("[Content unavailable or binary stream]"))
        .finally(() => setPreviewLoading(false));
    } else {
      setPreviewContent(null);
    }
  }, [selectedAsset, projectId]);

  // Filtered assets
  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (catFilter !== "all" && getMimeCategory(r.mime) !== catFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "ok" && r.status !== "ok") return false;
        if (statusFilter === "error" && r.status === "ok") return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return r.url.toLowerCase().includes(s) || (r.sha256 && r.sha256.toLowerCase().includes(s));
      }
      return true;
    });
  }, [resources, catFilter, statusFilter, search]);

  // Duplicate groups by sha256
  const dupGroups = useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    for (const r of resources) {
      if (r.sha256 && r.status === "ok") {
        const arr = map.get(r.sha256) || [];
        arr.push(r);
        map.set(r.sha256, arr);
      }
    }
    const dups = new Map<string, ResourceItem[]>();
    for (const [k, v] of map.entries()) {
      if (v.length > 1) dups.set(k, v);
    }
    return dups;
  }, [resources]);

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedSha(txt);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0E14] text-zinc-200">
      {/* Top Bar / Controls */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets by URL, name, or SHA-256..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#2DD4BF]/60 transition-colors"
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="p-1 hover:text-zinc-100 text-zinc-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Categories */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            {["all", "pages", "css", "javascript", "images", "documents"].map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-2.5 py-1 rounded-md capitalize font-mono transition-all ${
                  catFilter === cat
                    ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2DD4BF]/60"
          >
            <option value="all">All Statuses</option>
            <option value="ok">200 OK Only</option>
            <option value="error">Errors Only</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchResources}
            disabled={loading}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-[#2DD4BF] transition-colors"
            title="Reload assets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2DD4BF]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Assets List / Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
              Scanning and loading asset records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
              <FolderOpen className="w-8 h-8 text-zinc-700" />
              <p>No assets match current criteria.</p>
              {resources.length === 0 && (
                <p className="text-zinc-600">Start a collection run to discover and index site assets.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 text-zinc-400 font-mono select-none z-10">
                <tr>
                  <th className="py-2.5 px-3 w-16">Status</th>
                  <th className="py-2.5 px-3">Resource URL</th>
                  <th className="py-2.5 px-3 w-28">Type</th>
                  <th className="py-2.5 px-3 w-24 text-right">Size</th>
                  <th className="py-2.5 px-3 w-28 font-mono">SHA-256</th>
                  <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filtered.map(r => {
                  const isSelected = selectedAsset?.id === r.id;
                  const isDup = r.sha256 && (dupGroups.get(r.sha256)?.length || 0) > 1;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedAsset(r)}
                      className={`hover:bg-zinc-900/60 cursor-pointer transition-colors ${
                        isSelected ? "bg-teal-950/25 border-l-2 border-l-[#2DD4BF]" : ""
                      }`}
                    >
                      {/* Status */}
                      <td className="py-2 px-3 font-mono">
                        {r.status === "ok" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40">
                            {r.http_status || 200}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-400 border border-red-800/40">
                            {r.http_status || r.status.toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* URL & Path */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <MimeIcon mime={r.mime} />
                          <span className="font-mono text-zinc-300 truncate max-w-md" title={r.url}>
                            {r.url}
                          </span>
                          {isDup && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-800/40" title="Identical hash shared with another URL">
                              DUP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-2 px-3 text-zinc-400 font-mono truncate">
                        {r.mime ? r.mime.split(";")[0] : r.detected || "unknown"}
                      </td>

                      {/* Size */}
                      <td className="py-2 px-3 text-right font-mono text-zinc-400">
                        {fmtBytes(r.size)}
                      </td>

                      {/* SHA-256 */}
                      <td className="py-2 px-3 font-mono text-zinc-500">
                        {r.sha256 ? `${r.sha256.slice(0, 8)}…` : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedAsset(r);
                          }}
                          className="p-1 hover:text-[#2DD4BF] text-zinc-500 transition-colors"
                          title="Preview asset"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Side Detail / Preview Drawer */}
        {selectedAsset && (
          <div className="w-[420px] border-l border-zinc-800/80 bg-zinc-950/90 flex flex-col h-full animate-in slide-in-from-right-4 duration-150">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <MimeIcon mime={selectedAsset.mime} />
                <span className="font-mono text-xs font-semibold text-zinc-200 truncate max-w-[260px]">
                  {selectedAsset.url.split("/").pop() || "index.html"}
                </span>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Table */}
            <div className="p-3.5 border-b border-zinc-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Status</span>
                <span className={selectedAsset.status === "ok" ? "text-[#2DD4BF]" : "text-red-400"}>
                  {selectedAsset.status.toUpperCase()} ({selectedAsset.http_status || 200})
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>MIME Type</span>
                <span className="text-zinc-200">{selectedAsset.mime || "unknown"}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Decoded Size</span>
                <span className="text-zinc-200">{fmtBytes(selectedAsset.size)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Crawl Depth</span>
                <span className="text-zinc-200">{selectedAsset.depth}</span>
              </div>
              {selectedAsset.sha256 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>SHA-256</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-300 truncate max-w-[150px]">{selectedAsset.sha256}</span>
                    <button
                      onClick={() => copyToClipboard(selectedAsset.sha256!)}
                      className="p-0.5 hover:text-[#2DD4BF]"
                      title="Copy full SHA-256"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              {copiedSha && (
                <p className="text-[10px] text-teal-400 text-right">Hash copied to clipboard!</p>
              )}
            </div>

            {/* Sandboxed Preview Area */}
            <div className="flex-1 p-3.5 overflow-auto bg-[#0A0A0F] flex flex-col">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                Safe Sandboxed Preview
              </p>

              {previewLoading ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs gap-2">
                  <div className="w-4 h-4 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
                  Loading asset...
                </div>
              ) : selectedAsset.mime?.includes("image") ? (
                <div className="flex-1 flex items-center justify-center bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2">
                  {/* Safe image display */}
                  <img
                    src={`/api/projects/${projectId}/resources/${selectedAsset.id}/content`}
                    alt="Preview"
                    className="max-h-64 max-w-full object-contain rounded"
                  />
                </div>
              ) : selectedAsset.mime?.includes("svg") && previewContent ? (
                <div className="flex-1 bg-white p-2 rounded border border-zinc-800 overflow-auto">
                  {/* SVG rendered strictly inert via DOMPurify */}
                  <div
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent) }}
                  />
                </div>
              ) : selectedAsset.mime?.includes("html") && previewContent ? (
                <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="p-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 flex justify-between">
                    <span>Sandboxed IFrame (Scripts Disabled)</span>
                  </div>
                  <iframe
                    sandbox=""
                    srcDoc={DOMPurify.sanitize(previewContent)}
                    title="Sanitized Preview"
                    className="flex-1 w-full border-none bg-white"
                  />
                </div>
              ) : previewContent ? (
                <div className="flex-1 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 overflow-auto font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre">
                  {previewContent}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs text-center p-4">
                  Binary or non-textual resource. Preserved as raw content-addressed bytes.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-zinc-500">ID: {selectedAsset.id}</span>
              <div className="flex items-center gap-2">
                {selectedAsset.sha256 && selectedAsset.status === "ok" && (
                  <button
                    onClick={() => {
                      const urlPart = selectedAsset.url.split("?")[0].split("#")[0].replace(/\/+$/, "");
                      const filename = urlPart.split("/").pop() || `asset-${selectedAsset.id}`;
                      apiDownload(`/api/projects/${projectId}/resources/${selectedAsset.id}/download`, filename);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 border border-[#2DD4BF]/40 rounded-lg text-xs font-mono text-[#2DD4BF] transition-colors cursor-pointer"
                    title="Download this file directly"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </button>
                )}
                <a
                  href={selectedAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Original Link
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-2.5 px-4 border-t border-zinc-800/80 bg-zinc-950 text-xs font-mono text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Total: <strong className="text-zinc-300">{resources.length}</strong></span>
          <span>Showing: <strong className="text-zinc-300">{filtered.length}</strong></span>
          {dupGroups.size > 0 && (
            <span className="text-indigo-400">
              Duplicates: <strong>{dupGroups.size}</strong> hash collision groups
            </span>
          )}
        </div>
        <div>
          Total payload: <strong className="text-[#2DD4BF]">{fmtBytes(resources.reduce((a, r) => a + (r.size || 0), 0))}</strong>
        </div>
      </div>
    </div>
  );
}
