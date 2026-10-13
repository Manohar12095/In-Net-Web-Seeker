import { useState } from "react";
import { ShieldCheck, AlertTriangle, Check } from "lucide-react";

interface AuthorizedUseDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export function AuthorizedUseDialog({ isOpen, onAccept, onCancel }: AuthorizedUseDialogProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121A] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-white/6 pb-4">
          <div className="p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/40 text-[#2DD4BF]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 font-display">Authorized Use Consent</h2>
            <p className="text-xs text-zinc-400">Responsible intelligence and safe collection policy</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
          <p>
            <strong className="text-zinc-100 font-medium">In Net Web Seeker</strong> is designed for website intelligence, digital asset archiving, infrastructure analysis, and authorized security assessments.
          </p>

          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-2 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mandatory Authorization Notice</span>
            </div>
            <p className="text-amber-300/90 pl-6 leading-relaxed">
              You must only target domains, URLs, or servers that you own or have explicit authorization to collect and inspect. Unauthorized automated scanning or crawling may violate applicable laws and terms of service.
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-400 pl-1">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>Strict read-only GET requests only — zero exploitation or state changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>SSRF-guarded outbound engine protects internal network boundaries</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>Zero credentials bypass, paywall bypass, or automated CAPTCHA defeat</span>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6 cursor-pointer select-none hover:bg-white/5 transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-zinc-700 text-[#2DD4BF] focus:ring-0 focus:ring-offset-0 accent-[#2DD4BF] cursor-pointer"
          />
          <span className="text-xs text-zinc-300 leading-snug">
            I confirm that I am authorized to collect and analyze this target, and I will use this software in compliance with all relevant laws and ethics.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={onAccept}
            className={`px-5 py-2 rounded-lg text-xs font-medium transition-all ${
              agreed
                ? "bg-[#2DD4BF] text-zinc-950 hover:bg-[#20b8a3] shadow-[0_0_20px_rgba(45,212,191,0.25)] cursor-pointer"
                : "bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5"
            }`}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
