// src/features/home/useTargetValidation.ts
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Parsed = {
  kind: string; normalized: string; host: string; warnings: string[]; errors: string[]; modules: string[];
};

function fallbackParse(input: string): Parsed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    let urlStr = trimmed;
    if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
      urlStr = "https://" + urlStr;
    }
    const u = new URL(urlStr);
    if (!u.hostname) return null;
    return {
      kind: "url",
      normalized: u.toString(),
      host: u.hostname,
      warnings: [],
      errors: [],
      modules: ["http", "dns", "rdap", "tls", "technologies", "security"],
    };
  } catch {
    return null;
  }
}

export function useTargetValidation(input: string): Parsed | null {
  const [res, setRes] = useState<Parsed | null>(null);
  useEffect(() => {
    if (!input.trim()) { setRes(null); return; }          // calm until the user types
    let alive = true;

    // Provide instant responsive feedback while server validates
    const local = fallbackParse(input);
    if (local) setRes((prev) => prev ?? local);

    const t = setTimeout(() => {
      api<Parsed>(`/api/targets/validate?input=${encodeURIComponent(input)}`)
        .then((p) => {
          if (alive) setRes(p);
        })
        .catch(() => {
          if (alive && local) setRes(local);
        });
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [input]);
  return res;
}
