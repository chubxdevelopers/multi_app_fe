// Prefer the current origin for API requests when running in the browser.
// If an explicit BACKEND_URL is provided at build time, use it unless it
// appears to be a stale or invalid host (common when a trycloudflare value
// was accidentally embedded during build). This avoids DNS/network errors
// in local/dev usage where the frontend should talk to the same origin.
const fallbackOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
const envBase = (process.env.BACKEND_URL as string) || "";
// If envBase looks suspicious (contains trycloudflare or is empty), prefer current origin
const suspicious = envBase && /trycloudflare|cloudflare|trycloudflare/i.test(envBase);
const BASE = !envBase || suspicious ? fallbackOrigin : envBase;

export async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}
