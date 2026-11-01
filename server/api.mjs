import { routeTable, simpleDispatch } from "./routes.mjs";
import { service } from "./service.mjs";
import { guarded, errorResponse, readJson } from "./transport.mjs";
import { fail } from "./errors.mjs";
import { Router } from "worktop";
export function createApi(db, clock) {
  const table = routeTable(db, service, clock);
  return guarded(async (req) => {
    if (new URL(req.url).search)
      fail("invalid_query", "Parâmetros de URL não são aceitos.", 400);
    const router = new Router();
    router.onerror = (_req, _res, status, error) =>
      error
        ? errorResponse(error, crypto.randomUUID())
        : Response.json(
            { code: "not_found", message: "Endpoint não encontrado." },
            { status: status || 404 },
          );
    for (const [method, path, handler] of table)
      router.add(method, path, (r) => handler(req, r.params));
    return router.run({ request: req, waitUntil() {} });
  });
}
