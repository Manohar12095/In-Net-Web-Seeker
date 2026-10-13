import { DownloadCloud, ShieldAlert, Cpu, PackageCheck } from "lucide-react";

export function FeatureCards() {
  const features = [
    {
      icon: <DownloadCloud className="w-5 h-5 text-[#2DD4BF]" />,
      title: "Content-Addressed Crawling",
      tag: "STREAM & DEDUP",
      description:
        "Every public web asset is streamed to disk and hashed via SHA-256 in real time. Decompression bomb limits and loopback SSRF guards protect your local environment.",
    },
    {
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
      title: "Passive Infrastructure Intel",
      tag: "NON-INVASIVE",
      description:
        "Harvests DNS records, RDAP ownership metadata, TLS certificate transparency, and HTTP security policies with zero active intrusive probes or exploitation.",
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-emerald-400" />,
      title: "Sandboxed Threat Neutralization",
      tag: "ZERO-SOCKET OFFLINE",
      description:
        "Preview scraped scripts, HTML, and graphics inside hardened sandboxes. Hostile SVG payloads and tracking beacons are neutralized prior to render.",
    },
    {
      icon: <PackageCheck className="w-5 h-5 text-amber-400" />,
      title: "Cryptographic ZIP Manifests",
      tag: "CHAIN OF CUSTODY",
      description:
        "Download self-verifying standalone archives with a complete SHA-256 hash manifest. Any file modification or tampering is instantly flagged upon verification.",
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto pt-6">
      <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-3 px-1">
        Architecture Highlights
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {features.map((feat, i) => (
          <div
            key={i}
            className="group p-4 rounded-xl border border-white/6 bg-[#12121A]/70 hover:bg-[#181824]/90 hover:border-white/12 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="p-2 rounded-lg bg-zinc-900 border border-white/6 group-hover:scale-105 transition-transform">
                {feat.icon}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/4 border border-white/6 text-zinc-400">
                {feat.tag}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1 font-display group-hover:text-white transition-colors">
              {feat.title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {feat.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
