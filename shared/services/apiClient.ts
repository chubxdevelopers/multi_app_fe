// In browser builds process.env may be empty; prefer current origin when
// BACKEND_URL isn't provided so requests target the same host as the frontend.
const fallbackOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";
const BASE = (process.env.BACKEND_URL as string) || fallbackOrigin;

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
