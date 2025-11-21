import { API_HOST } from "../../utils/axiosConfig";

export function buildFullApiUrl(path: string, company?: string, app?: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (company && app) {
    return `${API_HOST}/api/${company}/${app}${p}`;
  }
  return `${API_HOST}/api${p}`;
}

export function buildPublicApiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_HOST}/api/public${p}`;
}
