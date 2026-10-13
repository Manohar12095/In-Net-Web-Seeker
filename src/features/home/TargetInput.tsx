import React, { useState } from "react";
import { useTargetValidation, Parsed } from "./useTargetValidation";
import { Search, Globe, ArrowRight, AlertCircle, AlertTriangle, CheckCircle2, Cpu } from "lucide-react";

interface TargetInputProps {
  onStartCollection: (parsed: Parsed) => void;
}

export function TargetInput({ onStartCollection }: TargetInputProps) {
  const [value, setValue] = useState("");
  const parsed = useTargetValidation(value);

  const hasErrors = parsed ? parsed.errors.length > 0 : false;
  const hasWarnings = parsed ? parsed.warnings.length > 0 : false;
  const isValid = parsed ? parsed.errors.length === 0 && parsed.normalized.length > 0 : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && parsed) {
      onStartCollection(parsed);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 ${
            hasErrors 
              ? "border-[#EF4444]/60 bg-[#12121A]/90 shadow-[0_0_20px_rgba(239,68,68,0.1)]" 
              : isValid 
                ? "border-[#2DD4BF]/50 bg-[#12121A]/95 shadow-[0_0_25px_rgba(45,212,191,0.12)] ring-1 ring-[#2DD4BF]/30" 
                : "border-white/10 bg-[#12121A]/80 hover:border-white/20 focus-within:border-[#2DD4BF]/40"
          }`}
        >
          <div className="text-zinc-400">
            {isValid ? (
              <Globe className="w-5 h-5 text-[#2DD4BF] animate-pulse" />
            ) : hasErrors ? (
              <AlertCircle className="w-5 h-5 text-[#EF4444]" />
            ) : (
              <Search className="w-5 h-5 text-zinc-500" />
            )}
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter target: domain, URL, or IP (e.g. example.com, https://target.io)"
            className="flex-1 bg-transparent text-[#E4E4ED] text-base placeholder-zinc-500 outline-none font-mono"
            autoFocus
            spellCheck={false}
          />

          {parsed && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-mono rounded tracking-wider uppercase ${
                hasErrors 
                  ? "bg-red-950/60 text-red-300 border border-red-800/40" 
                  : "bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40"
              }`}>
                {parsed.kind}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              isValid
                ? "bg-[#2DD4BF] text-zinc-950 hover:bg-[#20b8a3] hover:shadow-[0_0_20px_rgba(45,212,191,0.35)] cursor-pointer active:scale-95"
                : "bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5"
            }`}
          >
            <span>Start Collection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Live validation feedback tray */}
      {parsed && (
        <div className="rounded-lg border border-white/8 bg-[#181824]/90 p-4 space-y-3 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Target resolution summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400 pb-2 border-b border-white/6">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">RESOLVED:</span>
              <span className="text-zinc-200 font-semibold">{parsed.normalized}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">HOST:</span>
              <span className="text-zinc-300">{parsed.host}</span>
            </div>
          </div>

          {/* Errors display */}
          {hasErrors && (
            <div className="space-y-1.5">
              {parsed.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings display */}
          {hasWarnings && (
            <div className="space-y-1.5">
              {parsed.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Active pipeline modules */}
          {isValid && parsed.modules.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-2 font-mono uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Modules Armed for Pipeline:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsed.modules.map((mod, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#2DD4BF]" />
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target hint chips */}
      {!parsed && (
        <div className="flex items-center justify-center gap-3 text-xs text-zinc-500">
          <span className="text-zinc-600 font-mono">Supported targets:</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-zinc-400">https://domain.com</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-zinc-400">subdomain.site.org</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-zinc-400">198.51.100.42</span>
        </div>
      )}
    </div>
  );
}
