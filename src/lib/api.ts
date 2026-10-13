// src/lib/api.ts
import { invoke } from "@tauri-apps/api/core";

type Cfg = { base: string; token: string };
let cfg: Promise<Cfg> | undefined;

export function apiConfig(): Promise<Cfg> {
  cfg ??= (async () => {
    if ("__TAURI_INTERNALS__" in window) {
      // Running inside the Tauri desktop app — get port & token from Rust
      const [port, token] = await invoke<[number, string]>("api_info");
      return { base: `http://127.0.0.1:${port}`, token };
    }

    // Web / Vercel deployment:
    // - VITE_BACKEND_URL is injected by Vercel via the service binding at build time.
    // - In production the Vercel rewrite routes /api/* to the backend service,
    //   so we can use an empty base (same-origin relative paths).
    // - Locally, Vite proxies /api → http://127.0.0.1:8000 (see vite.config.ts).
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
    const base = backendUrl || "";            // empty = same-origin (Vercel / Vite proxy)
    const token = import.meta.env.VITE_API_TOKEN ?? import.meta.env.VITE_DEV_TOKEN ?? (import.meta.env.DEV ? "dev-token" : "");
    return { base, token };
  })();
  return cfg;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, token } = await apiConfig();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!r.ok) {
    try {
      const err = await r.json();
      throw err.detail ?? { code: "http_error", message: r.statusText, retryable: true };
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) throw e;
      throw { code: "http_error", message: `HTTP ${r.status} ${r.statusText}`, retryable: true };
    }
  }
  return r.json();
}

export async function apiText(path: string, init: RequestInit = {}): Promise<string> {
  const { base, token } = await apiConfig();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!r.ok) {
    try {
      const err = await r.json();
      throw err.detail ?? { code: "http_error", message: r.statusText, retryable: true };
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) throw e;
      throw { code: "http_error", message: `HTTP ${r.status} ${r.statusText}`, retryable: true };
    }
  }
  return r.text();
}

export async function apiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const { base, token } = await apiConfig();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!r.ok) {
    try {
      const err = await r.json();
      throw err.detail ?? { code: "http_error", message: r.statusText, retryable: true };
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) throw e;
      throw { code: "http_error", message: `HTTP ${r.status} ${r.statusText}`, retryable: true };
    }
  }
  return r.blob();
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const blob = await apiBlob(path);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

// EventSource cannot send an Authorization header, so stream with fetch.
export async function* sse<T = any>(path: string, signal?: AbortSignal): AsyncGenerator<T> {
  const { base, token } = await apiConfig();
  const r = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, signal });
  const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).split("\n").find((l) => l.startsWith("data: "));
      buf = buf.slice(i + 2);
      if (line) yield JSON.parse(line.slice(6)) as T;
    }
  }
}
