// src/features/home/useTargetValidation.ts
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Parsed = {
  kind: string; normalized: string; host: string; warnings: string[]; errors: string[]; modules: string[];
};

export function useTargetValidation(input: string): Parsed | null {
  const [res, setRes] = useState<Parsed | null>(null);
  useEffect(() => {
    if (!input.trim()) { setRes(null); return; }          // calm until the user types
    let alive = true;
    const t = setTimeout(() => {
      api<Parsed>(`/api/targets/validate?input=${encodeURIComponent(input)}`)
        .then((p) => alive && setRes(p)).catch(() => {});
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [input]);
  return res;
}
