import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'refreshToken';
const ACCESS_KEY = 'accessToken';
const COMPANY_KEY = 'companySlug';
const APP_KEY = 'appSlug';

export async function saveRefreshToken(token: string | null){
  if(token == null) return SecureStore.deleteItemAsync(REFRESH_KEY);
  return SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function getRefreshToken(){
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function deleteRefreshToken(){
  return SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function saveAccessToken(token: string | null){
  if(token == null) return SecureStore.deleteItemAsync(ACCESS_KEY);
  return SecureStore.setItemAsync(ACCESS_KEY, token);
}

export async function getAccessToken(){
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function clearAll(){
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(ACCESS_KEY);
}

export async function saveCompanySlug(slug: string | null){
  if(slug == null) return SecureStore.deleteItemAsync(COMPANY_KEY);
  return SecureStore.setItemAsync(COMPANY_KEY, slug);
}

export async function getCompanySlug(){
  return SecureStore.getItemAsync(COMPANY_KEY);
}

export async function saveAppSlug(slug: string | null){
  if(slug == null) return SecureStore.deleteItemAsync(APP_KEY);
  return SecureStore.setItemAsync(APP_KEY, slug);
}

export async function getAppSlug(){
  return SecureStore.getItemAsync(APP_KEY);
}
