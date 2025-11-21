import { saveRefreshToken, saveAccessToken, getRefreshToken, clearAll } from './tokenStorage';
import { setAccessToken } from './apiClient';
import jwt_decode from 'jwt-decode';
import { buildFullApiUrl, buildPublicApiUrl } from './urlBuilder';

const BASE = (process.env.BACKEND_URL as string) || 'http://localhost:3000';

type LoginResp = { accessToken?: string; refreshToken?: string; user?: any; dashboardRoute?: string };

async function rawPostUrl(url: string, body: any){
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try{ return JSON.parse(text); }catch{ return text; }
}

// login: optionally provide company/app to post to contextual API path
export async function login(payload: { email: string; password: string }, company?: string, app?: string){
  const url = buildFullApiUrl('/auth/login', company, app);
  const data = await rawPostUrl(url, payload) as LoginResp;
  if(data?.refreshToken) await saveRefreshToken(data.refreshToken);
  if(data?.accessToken){
    setAccessToken(data.accessToken);
    await saveAccessToken(data.accessToken);
  }
  return data;
}

export async function refreshTokens(){
  const refresh = await getRefreshToken();
  if(!refresh) throw new Error('No refresh token');
  const url = buildPublicApiUrl('/auth/refresh');
  const data = await rawPostUrl(url, { refreshToken: refresh }) as LoginResp;
  if(data?.refreshToken) await saveRefreshToken(data.refreshToken);
  if(data?.accessToken){
    setAccessToken(data.accessToken);
    await saveAccessToken(data.accessToken);
  }
  return data;
}

export async function getSession(){
  // Try to refresh to get a valid access token, then decode it for user info
  try{
    const data = await refreshTokens();
    const access = data?.accessToken;
    if(access){
      try{
        const payload: any = jwt_decode(access);
        return { user: payload.user ?? payload, accessToken: access };
      }catch(e){ return { accessToken: access }; }
    }
  }catch(e){ }
  return null;
}

export async function logout(){
  try{
    const url = buildPublicApiUrl('/auth/logout');
    await rawPostUrl(url, {});
  }catch(e){ }
  await clearAll();
  setAccessToken(null);
  return null;
}
