import {
  saveRefreshToken,
  saveAccessToken,
  getRefreshToken,
  clearAll,
  getAccessToken,
} from "./tokenStorage";
import { setAccessToken } from "./apiClient";
import jwt_decode from "jwt-decode";
import { buildFullApiUrl, buildPublicApiUrl } from "./urlBuilder";

const BASE = (process.env.BACKEND_URL as string) || "http://localhost:3000";

type LoginResp = {
  accessToken?: string;
  refreshToken?: string;
  user?: any;
  dashboardRoute?: string;
};

async function rawPostUrl(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  if (!res.ok) {
    // Normalize error message
    const msg =
      (parsed && (parsed.message || parsed.error)) ||
      parsed ||
      `HTTP ${res.status}`;
    const err: any = new Error(
      typeof msg === "string" ? msg : JSON.stringify(msg)
    );
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

async function rawGetUrl(url: string) {
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  if (!res.ok) {
    const msg =
      (parsed && (parsed.message || parsed.error)) ||
      parsed ||
      `HTTP ${res.status}`;
    const err: any = new Error(
      typeof msg === "string" ? msg : JSON.stringify(msg)
    );
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

// login: optionally provide company/app to post to contextual API path
export async function login(
  payload: { email: string; password: string },
  company?: string,
  app?: string
) {
  let companySlug = company;
  let appSlug = app;
  if (!companySlug) {
    // If caller didn't provide a company, try to pick the first available company
    try {
      const companies: any = await rawGetUrl(buildPublicApiUrl("/companies"));
      if (Array.isArray(companies) && companies.length > 0) {
        companySlug = companies[0].slug;
        console.debug(
          "[sessionService] auto-selected company slug:",
          companySlug
        );
      }
    } catch (e) {
      // ignore here; we'll throw later if no company
    }
  }
  if (!companySlug) {
    const e: any = new Error(
      "Login requires a company; none provided or available"
    );
    throw e;
  }
  const url = buildFullApiUrl("/auth/login", companySlug, appSlug);
  const data = (await rawPostUrl(url, payload)) as LoginResp;
  // Debug: log the raw response from the server before token handling
  try {
    console.debug(
      "[sessionService] raw login response:",
      JSON.parse(JSON.stringify(data))
    );
  } catch (e) {
    console.debug(
      "[sessionService] raw login response (non-serializable):",
      data
    );
  }
  // Some backends return `accessToken`/`refreshToken`, others return `token`.
  const token = (data as any).accessToken || (data as any).token;
  // If server didn't return a token, treat as login failure
  if (!token) {
    const msg = (data as any)?.message || "Login failed: no token returned";
    const e: any = new Error(msg);
    e.body = data;
    throw e;
  }
  if ((data as any).refreshToken)
    await saveRefreshToken((data as any).refreshToken);
  if (token) {
    setAccessToken(token);
    await saveAccessToken(token);
  }
  return data;
}

export async function refreshTokens() {
  const refresh = await getRefreshToken();
  if (!refresh) throw new Error("No refresh token");
  const url = buildPublicApiUrl("/auth/refresh");
  const data = (await rawPostUrl(url, { refreshToken: refresh })) as LoginResp;
  // Debug: log the raw refresh response
  try {
    console.debug(
      "[sessionService] raw refresh response:",
      JSON.parse(JSON.stringify(data))
    );
  } catch (e) {
    console.debug(
      "[sessionService] raw refresh response (non-serializable):",
      data
    );
  }
  const token = (data as any).accessToken || (data as any).token;
  if ((data as any).refreshToken)
    await saveRefreshToken((data as any).refreshToken);
  if (token) {
    setAccessToken(token);
    await saveAccessToken(token);
  }
  return data;
}

export async function getSession() {
  // Try to refresh to get a valid access token, then decode it for user info
  try {
    const data = await refreshTokens();
    const access = data?.accessToken;
    const accessToken = (data as any).accessToken || (data as any).token;
    if (accessToken) {
      try {
        const payload: any = jwt_decode(accessToken);
        return { user: payload.user ?? payload, accessToken };
      } catch (e) {
        return { accessToken };
      }
    }
  } catch (e) {}
  // If refresh failed (no refresh token), try to decode any stored access token
  try {
    const stored = await getAccessToken();
    if (stored) {
      try {
        const payload: any = jwt_decode(stored);
        return { user: payload.user ?? payload, accessToken: stored };
      } catch (e) {
        return { accessToken: stored };
      }
    }
  } catch (e) {}
  return null;
}

export async function logout() {
  try {
    const url = buildPublicApiUrl("/auth/logout");
    await rawPostUrl(url, {});
  } catch (e) {}
  await clearAll();
  setAccessToken(null);
  return null;
}
