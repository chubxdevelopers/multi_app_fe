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

  // Attempt the primary request, and if it fails due to network error or a
  // 404 we will retry once against the current origin (useful when
  // VITE_API_HOST points to an unreachable host in some deployments).
  const originBase =
    typeof window !== "undefined"
      ? `${window.location.origin}${opts.url.startsWith("/") ? "" : "/"}${
          opts.url
        }`
      : fullUrl;

  let attempt = 0;
  const maxAttempts = 2; // primary + optional fallback
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const headers = buildSecurityHeaders({
      token: opts.token,
      idempotencyKey: opts.idempotencyKey,
    });
    if (opts.body && !headers["Content-Type"])
      headers["Content-Type"] = "application/json";

    // choose URL: first attempt uses fullUrl, second attempt (if any) uses originBase
    const tryUrl = attempt === 1 ? fullUrl : originBase;
    try {
      const res = await fetch(tryUrl, {
        method: opts.method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        credentials: "include",
      });
      clearTimeout(id);

      const text = await res.text();
      let payload: any = text;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch (e) {
        // non-json response — keep raw text
      }

      if (!res.ok) {
        // If first attempt fails with 404 or network error, try the fallback once
        const err = new Error(`Request failed ${res.status}: ${text}`);
        (err as any).status = res.status;
        (err as any).body = payload;
        // If this was the first attempt and status is 404, continue to retry against origin
        if (attempt === 1 && (res.status === 404 || res.status === 0)) {
          lastError = err;
          continue;
        }
        throw err;
      }

      return payload;
    } catch (err: any) {
      clearTimeout(id);
      lastError = err;

      // treat abort as timeout
      const isTimeout =
        err && (err.name === "AbortError" || err instanceof DOMException);
      // retry on timeout if allowed
      if (isTimeout && attempt === 1) {
        continue;
      }

      // Retry once using origin fallback when first attempt had a network error
      if (attempt === 1) {
        // proceed to next loop to retry with originBase
        continue;
      }

      // otherwise, throw the last error
      throw err;
    }
  }

  // if we exit loop, throw last observed error
  throw lastError || new Error("Request failed");
}
