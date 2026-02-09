import bakedManifest from "./manifest.json";

export type ResourceDef = {
  name: string;
  endpoint: string;
  fields: string[];
  allowedOps: any;
};

export type Manifest = {
  schemaVersion: string;
  generatedAt: string;
  resources: ResourceDef[];
};

const STORAGE_KEY = "api_builder_manifest";
const ETAG_KEY = "api_builder_manifest_etag";

let currentManifest: Manifest = bakedManifest as Manifest;

// attempt to hydrate from localStorage immediately (fast start)
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const cached = JSON.parse(raw) as Manifest;
    if (
      !cached ||
      cached.schemaVersion !== (bakedManifest as Manifest).schemaVersion
    ) {
      currentManifest = bakedManifest as Manifest;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentManifest));
      } catch {}
    } else {
      currentManifest = cached;
    }
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentManifest));
    } catch {}
  }
} catch (e) {
  // ignore JSON errors and keep baked-in manifest
}

export function getResource(name: string): ResourceDef {
  const res = currentManifest.resources.find((r) => r.name === name);
  if (!res) throw new Error(`Resource not found: ${name}`);
  return res;
}

export function getSchemaVersion(): string {
  return currentManifest.schemaVersion;
}

export async function initRegistryRefresh(options?: {
  url?: string;
  onUpdated?: (m: Manifest) => void;
}) {
  const url = options?.url ?? "/schema/resources";
  // localStorage not available reliably in RN; skip background refresh for now
  return;
}

export function getCurrentManifest(): Manifest {
  return currentManifest;
}
