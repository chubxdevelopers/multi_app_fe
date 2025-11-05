import { buildSecurityHeaders } from "./security";
import { API_HOST } from "../utils/axiosConfig";

type SendOpts = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  query?: string;
  body?: any;
  idempotencyKey?: string;
  timeoutMs?: number;
  maxRetriesOnTimeout?: number;
  token?: string;
};

class TimeoutError extends Error {
  constructor(message?: string) {
    super(message || "timeout");
    this.name = "TimeoutError";
  }
}

export async function send(opts: SendOpts) {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const maxRetries = opts.maxRetriesOnTimeout ?? 1;
  // Resolve relative API paths to the backend host (dev server vs API host)
  const resolvedBase = opts.url.startsWith("http")
    ? opts.url
    : `${API_HOST}${opts.url.startsWith("/") ? "" : "/"}${opts.url}`;

  const fullUrl = opts.query
    ? `${resolvedBase}${resolvedBase.includes("?") ? "&" : "?"}${opts.query}`
    : resolvedBase;

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const headers = buildSecurityHeaders({
      token: opts.token,
      idempotencyKey: opts.idempotencyKey,
    });
    if (opts.body && !headers["Content-Type"])
      headers["Content-Type"] = "application/json";

    try {
      const res = await fetch(fullUrl, {
        method: opts.method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        // include cookies for auth (matches axios withCredentials)
        credentials: "include",
      });
      clearTimeout(id);

      const text = await res.text();
      // try to parse JSON, fallback to text
      let payload: any = text;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (e) {
        // leave as text
      }

      if (!res.ok) {
        const err = new Error(`Request failed ${res.status}: ${text}`);
        (err as any).status = res.status;
        (err as any).body = payload;
        throw err;
      }

      return payload;
    } catch (err: any) {
      clearTimeout(id);
      // treat abort as timeout
      const isTimeout =
        err && (err.name === "AbortError" || err instanceof DOMException);
      if (isTimeout && attempt <= maxRetries) {
        // retry only on timeout
        continue;
      }
      if (isTimeout) throw new TimeoutError();
      throw err;
    }
  }
}
