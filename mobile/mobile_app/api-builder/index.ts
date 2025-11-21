// Minimal API Builder for mobile: re-implements the query/mutate surface
// using the same interface as the web version so shared components work.
import { getResource } from "./registry";
import { validateFields, validateFilters } from "./validate";
import { send } from "./client";

type FieldSelection = (string | { path: string; as?: string })[];
type Filters = Record<string, unknown>;
type SortSpec = Record<string, "asc" | "desc">;

export async function query(opts: {
  resource: string;
  fields: FieldSelection;
  filters?: Filters;
  sort?: SortSpec;
  limit?: number;
  cursor?: string;
  timeoutMs?: number;
}) {
  const { resource, fields, filters, sort, limit, cursor, timeoutMs } = opts;

  // validation
  validateFields(resource, fields);
  validateFilters(resource, filters as any);

  const resDef = getResource(resource);

  // Build request body matching backend base_resource POST API
  const body: any = {
    operation: "query",
    resource,
    fields: (fields as (string | { path: string; as?: string })[]).map((f) =>
      typeof f === "string" ? f : f.as ? `${f.path}:${f.as}` : f.path
    ),
  };

  if (filters) body.filters = filters;
  if (sort) body.orderBy = sort;
  if (limit !== undefined || cursor) body.pagination = { limit, cursor };

  return send({ method: "POST", url: resDef.endpoint, body, timeoutMs });
}

export async function mutate(opts: {
  resource: string;
  fields: FieldSelection;
  data: Record<string, unknown>;
  method?: "POST" | "PUT";
  idempotencyKey?: string;
  timeoutMs?: number;
}) {
  const {
    resource,
    fields,
    data,
    method = "POST",
    idempotencyKey,
    timeoutMs,
  } = opts;

  validateFields(resource, fields);
  const resDef = getResource(resource);

  const operation = method === "POST" ? "insert" : "update";
  const body: any = {
    operation,
    resource,
    data,
  };

  return send({
    method: "POST",
    url: resDef.endpoint,
    body,
    idempotencyKey,
    timeoutMs,
  });
}
// (Mobile-only) api-builder implementation lives entirely in this folder.
