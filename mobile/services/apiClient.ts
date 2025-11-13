import Constants from 'expo-constants';

// Resolve a backend base URL for the running environment.
// - If BUILD-time BACKEND_URL is set, use it.
// - In Expo dev mode, derive host from the debuggerHost so device can reach the dev server.
// - Fallback to localhost (works when running an emulator on the same machine).
function resolveBase(){
  const env = process.env.BACKEND_URL;
  if(env) return env;

  // debuggerHost is like "192.168.1.5:8081" when running via Expo.
  const dbg = (Constants.manifest && (Constants.manifest as any).debuggerHost) ||
              (Constants.expoConfig && (Constants.expoConfig as any).extra && (Constants.expoConfig as any).extra.debuggerHost);
  if(dbg && typeof dbg === 'string'){
    const host = dbg.split(':')[0];
  return `http://${host}:4000`;
  }

  return 'http://localhost:4000';
}

const BASE = resolveBase();

async function handleResponse(res: Response){
  if(!res.ok){
    const text = await res.text().catch(()=>null);
    throw new Error(`Network error: ${res.status} ${res.statusText} ${text ?? ''}`);
  }
  return res.json().catch(()=>null);
}

export async function apiGet(path: string){
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  return handleResponse(res);
}

export async function apiPost(path: string, body: any){
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleResponse(res);
}
