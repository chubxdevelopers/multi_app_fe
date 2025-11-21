import {
  getAccessToken,
  saveAccessToken,
  getRefreshToken,
} from "./tokenStorage";
import { refreshTokens } from "./sessionService";
import { API_HOST } from "../../utils/axiosConfig";

// Use configured API_HOST from mobile utils so requests from device use the correct public URL
const BASE =
  (process.env.BACKEND_URL as string) || API_HOST || "http://localhost:4000";

let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  // persist for quick restore (optional)
  if (token) saveAccessToken(token);
}

async function getToken() {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  const t = await getAccessToken();
  inMemoryAccessToken = t;
  return t;
}

async function rawFetch(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path}`;
  console.debug(
    "[apiClient] rawFetch url:",
    url,
    "opts:",
    opts && (opts as any).method
  );
  try {
    const res = await fetch(url, opts);
    return res;
  } catch (err: any) {
    console.error("[apiClient] fetch error for", url, err?.message || err);
    // Re-throw with a clearer message for the caller
    const e: any = new Error(err?.message || "Network request failed");
    e.cause = err;
    throw e;
  }
}

async function fetchWithAuth(
  path: string,
  opts: RequestInit = {},
  retry = true
) {
  const token = await getToken();
  const headers = new Headers((opts.headers as any) || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await rawFetch(path, { ...opts, headers });

  if (res.status === 401 && retry) {
    // try refresh
    try {
      const refreshed = await refreshTokens();
      if (refreshed?.accessToken) {
        setAccessToken(refreshed.accessToken);
        // retry once
        return fetchWithAuth(path, opts, false);
      }
    } catch (e) {}
  }

  if (!res.ok) {
    const text = await res.text().catch(() => undefined);
    throw new Error(text || res.statusText || "Network error");
  }

  // parse JSON if any
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export async function apiGet(path: string) {
  return fetchWithAuth(path, { method: "GET" });
}

export async function apiPost(path: string, body: any) {
  return fetchWithAuth(path, { method: "POST", body: JSON.stringify(body) });
}
