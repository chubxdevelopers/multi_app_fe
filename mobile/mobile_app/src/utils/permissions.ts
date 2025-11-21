// Utility to inspect uiPermissions from backend. Backend shapes vary (array of objects,
// nested arrays, or objects with different keys). Provide a robust matcher.

export type PermissionLike = any;

function flattenPermissions(p: PermissionLike): any[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.flatMap(flattenPermissions);
  if (typeof p === "object") return [p];
  return [];
}

export function hasPermission(
  permissions: PermissionLike,
  opts: { feature_tag?: string; capability?: string } | string
): boolean {
  if (!permissions) return false;
  const flat = flattenPermissions(permissions);
  const feature = typeof opts === "string" ? opts : opts.feature_tag;
  const capability = typeof opts === "string" ? opts : opts.capability;

  return flat.some((p: any) => {
    if (!p || typeof p !== "object") return false;
    // common keys
    if (
      feature &&
      (p.feature_tag === feature || p.feature === feature || p.name === feature)
    )
      return true;
    if (
      capability &&
      (p.capability === capability ||
        (Array.isArray(p.capabilities) && p.capabilities.includes(capability)))
    )
      return true;
    // some backends keep permissions as strings
    if (typeof p === "string" && (p === feature || p === capability))
      return true;
    // nested check: permission may be under `permission` or `perm`
    if (p.permission && typeof p.permission === "object") {
      if (
        feature &&
        (p.permission.feature_tag === feature || p.permission.name === feature)
      )
        return true;
      if (capability && p.permission.capability === capability) return true;
    }
    return false;
  });
}

export default { hasPermission };
