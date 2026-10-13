// src/lib/api.ts
import { invoke } from "@tauri-apps/api/core";

type Cfg = { base: string; token: string };
let cfg: Promise<Cfg> | undefined;

export function apiConfig(): Promise<Cfg> {
  cfg ??= (async () => {
    if ("__TAURI_INTERNALS__" in window) {
      const [port, token] = await invoke<[number, string]>("api_info");
      return { base: `http://127.0.0.1:${port}`, token };
    }
    return { base: import.meta.env.VITE_DEV_API ?? "http://127.0.0.1:8765",
             token: import.meta.env.VITE_DEV_TOKEN ?? "dev-token" };   // browser-only dev
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
