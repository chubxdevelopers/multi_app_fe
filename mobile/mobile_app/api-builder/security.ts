import { getSchemaVersion } from "./registry";

function uuidv4(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID)
    return (crypto as any).randomUUID();
  // fallback: simple RFC4122-ish generator (not crypto-strong but fine for ids)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildSecurityHeaders(opts?: {
  token?: string;
  idempotencyKey?: string;
  requestId?: string;
}) {
  // Accept either 'token' or legacy 'auth.token' keys in storage so both
  // axios-based frontend and this mobile fetch client work.
  let token: string | undefined;
  try {
    // localStorage isn't available in React Native; check global if set
    token = (global as any).__TOKEN__ || undefined;
  } catch (e) {
    token = undefined;
  }

  const headers: Record<string, string> = {
    "X-Resource-Version": getSchemaVersion(),
    "x-request-id": opts?.requestId ?? uuidv4(),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  const idk = opts?.idempotencyKey ?? uuidv4();
  // include idempotency header only for mutating requests
  headers["Idempotency-Key"] = idk;

  return headers;
}

export { uuidv4 };
