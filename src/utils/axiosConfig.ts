import axios from "axios";

// Build baseURL for multi-tenant requests
// Force API requests to use the current origin to avoid calls going to a
// stale or misconfigured build-time host (e.g. trycloudflare) which produced
// 404/network errors in your environment. If you intentionally host the API
// on a separate domain, set up a proper reverse proxy or update this code.
const forcedOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:4000";
export const API_HOST = forcedOrigin.replace(/\/$/, "");

// Extract company and app slugs from the URL path
function extractSlugs() {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    // The URL pattern should be /:company/:app/...
    if (parts.length >= 2) {
      return {
        company: parts[0],
        app: parts[1],
      };
    }
  } catch (e) {
    console.error("Error extracting company/app from path:", e);
  }
  return { company: null, app: null };
}

const { company: companySlug, app: appSlug } = extractSlugs();

// Set baseURL to include company and app slugs if available
const baseURL =
  companySlug && appSlug
    ? `${API_HOST}/api/${companySlug}/${appSlug}`
    : `${API_HOST}/api`;

const instance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Ensure cookies (JWT token from backend) are sent with requests
  withCredentials: true,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      const { company, app } = extractSlugs();
      // Redirect to frontend login, not backend API path
      if (company && app) {
        window.location.href = `/${company}/${app}/login`;
      } else {
        window.location.href = `/select-company`;
      }
    }
    return Promise.reject(error);
  }
);

export default instance;

// Helper to build a full API URL for direct requests
export function buildFullApiUrl(path: string) {
  // normalize path
  const p = path.startsWith("/") ? path : `/${path}`;
  const { company, app } = extractSlugs();

  // Build the full URL with proper company/app context
  const url =
    company && app
      ? `${API_HOST}/api/${company}/${app}${p}`
      : `${API_HOST}/api${p}`;

  console.log("Building API URL:", { company, app, path: p, url });
  return url;
}

// Helper to build a public API URL that ignores slugs
export function buildPublicApiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_HOST}/api/public${p}`;
}
