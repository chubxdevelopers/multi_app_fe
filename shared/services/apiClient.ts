// Simple API client: prefer Vite-provided `VITE_API_HOST` when available,
// otherwise fall back to the page origin. This avoids hitting the dev server
// (port 5173) for API calls when the backend runs on a separate port.
let BASE = "http://localhost:4000";
try {
  // `import.meta.env.VITE_API_HOST` is injected by Vite at build/dev time.
  // Access via import.meta inside a try/catch to avoid syntax/runtime issues
  // when this module is processed outside of Vite's environment.
  // @ts-ignore
  const envHost =
    (import.meta && import.meta.env && import.meta.env.VITE_API_HOST) || null;
  if (envHost) BASE = String(envHost).replace(/\/$/, "");
  else if (typeof window !== "undefined") BASE = window.location.origin;
} catch (e) {
  if (typeof window !== "undefined") BASE = window.location.origin;
}
// helpful debug log in development (safe access to import.meta)
try {
  // @ts-ignore
  if (
    typeof window !== "undefined" &&
    import.meta &&
    import.meta.env &&
    import.meta.env.DEV
  ) {
    console.info("apiClient BASE set to:", BASE);
  }
} catch (e) {
  // ignore when import.meta isn't available
}

export async function apiGet(path: string) {
  const url = `${BASE}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, { credentials: "include" });
  // Try to parse JSON response even when status is not OK so callers can
  // inspect server-side error messages that are returned as JSON.
  let json: any = null;
  try {
    json = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("Network error");
    throw e;
  }
  return json;
}

export async function apiPost(path: string, body: any) {
  const url = `${BASE}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Parse JSON body even when status indicates an error so frontend can
  // show server-provided error details instead of a generic Network error.
  let json: any = null;
  try {
    json = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("Network error");
    throw e;
  }
  return json;
}
