import { getAccessToken, saveAccessToken, getRefreshToken } from './tokenStorage';
import { refreshTokens } from './sessionService';

const BASE = (process.env.BACKEND_URL as string) || 'http://localhost:3000';

let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null){
  inMemoryAccessToken = token;
  // persist for quick restore (optional)
  if(token) saveAccessToken(token);
}

async function getToken(){
  if(inMemoryAccessToken) return inMemoryAccessToken;
  const t = await getAccessToken();
  inMemoryAccessToken = t;
  return t;
}

async function rawFetch(path: string, opts: RequestInit = {}){
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  return res;
}

async function fetchWithAuth(path: string, opts: RequestInit = {}, retry = true){
  const token = await getToken();
  const headers = new Headers(opts.headers as any || {});
  headers.set('Content-Type', 'application/json');
  if(token) headers.set('Authorization', `Bearer ${token}`);

  const res = await rawFetch(path, { ...opts, headers });

  if(res.status === 401 && retry){
    // try refresh
    try{
      const refreshed = await refreshTokens();
      if(refreshed?.accessToken){
        setAccessToken(refreshed.accessToken);
        // retry once
        return fetchWithAuth(path, opts, false);
      }
    }catch(e){ }
  }

  if(!res.ok) {
    const text = await res.text().catch(()=>undefined);
    throw new Error(text || res.statusText || 'Network error');
  }

  // parse JSON if any
  const ct = res.headers.get('content-type') || '';
  if(ct.includes('application/json')) return res.json();
  return res.text();
}

export async function apiGet(path: string){
  return fetchWithAuth(path, { method: 'GET' });
}

export async function apiPost(path: string, body: any){
  return fetchWithAuth(path, { method: 'POST', body: JSON.stringify(body) });
}
