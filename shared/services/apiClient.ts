// Simple API client that targets the current origin. This ensures the
// frontend talks to the backend served from the same host and avoids
// using stale build-time host values.
const BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

export async function apiGet(path: string) {
  const url = `${BASE}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const url = `${BASE}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}
