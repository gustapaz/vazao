import { createStore } from "./store.mjs";
import { fail } from "./errors.mjs";
import { specification } from "./spec.mjs";
export function routeTable(db, service, clock) {
  const s = createStore(db, service, clock);
  return [
    ["GET", "/api/health", () => s.health()],
    ["GET", "/api/catalog", () => s.catalog()],
    ["GET", "/api/openapi.json", () => Response.json(specification(service))],
    ["POST", "/api/compute", (req) => s.compute(req)],
    ["POST", "/api/records", (req) => s.create(req)],
    ["GET", "/api/records/:id/export", (req, p) => s.export(req, p.id)],
    ["GET", "/api/records/:id", (req, p) => s.get(req, p.id)],
    ["PUT", "/api/records/:id", (req, p) => s.update(req, p.id)],
    ["POST", "/api/records/:id/publish", (req, p) => s.publish(req, p.id)],
    ["DELETE", "/api/records/:id", (req, p) => s.remove(req, p.id)],
  ];
}
export function simpleDispatch(table) {
  return (req) => {
    const url = new URL(req.url);
    if (url.search)
      fail("invalid_query", "Parâmetros de URL não são aceitos.", 400);
    for (const [method, path, handler] of table) {
      if (req.method !== method) continue;
      const pattern = new RegExp(
          "^" + path.replace(":id", "([a-f0-9-]{36})") + "$",
        ),
        m = url.pathname.match(pattern);
      if (m) return handler(req, { id: m[1] });
    }
    fail("not_found", "Endpoint não encontrado.", 404);
  };
}
