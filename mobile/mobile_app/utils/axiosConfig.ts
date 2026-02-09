import Constants from "expo-constants";
import { Platform } from "react-native";

function getHostFromManifest() {
  try {
    const m: any = Constants.manifest || (Constants as any).expoConfig || {};
    if (m?.extra?.backendUrl || m?.extra?.apiHost) {
      return m.extra.backendUrl || m.extra.apiHost;
    }
  } catch {}
  return null;
}

function getLanHostFromExpo() {
  try {
    const cfg: any =
      (Constants as any).expoGoConfig ||
      (Constants as any).manifest2 ||
      Constants.manifest;
    const hostUri: string | undefined = cfg?.hostUri;
    const match = hostUri?.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (match?.[1]) {
      return `http://${match[1]}:4000`;
    }
  } catch {}
  return null;
}

const API_HOST =
  // Vite (web) environment variable
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_HOST) ||
  // Expo manifest extra
  getHostFromManifest() ||
  // LAN host for mobile devices only
  (Platform.OS !== "web" && getLanHostFromExpo()) ||
  // local dev for mobile only
  (Platform.OS !== "web"
    ? Platform.OS === "android"
      ? "http://10.0.2.2:4000"
      : "http://localhost:4000"
    : null);

if (__DEV__) {
  console.debug("[API_HOST] Using API host:", API_HOST);
}

export { API_HOST };
