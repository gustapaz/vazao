import { DomainError, fail } from "./errors.mjs";
export async function readJson(req) {
  if (
    req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    fail("unsupported_media", "Use application/json.", 415);
  if (
    req.headers.has("content-encoding") &&
    req.headers.get("content-encoding") !== "identity"
  )
    fail("unsupported_encoding", "Compressão não aceita.", 415);
  const reader = req.body?.getReader();
  if (!reader) fail("invalid_json", "Envie JSON.", 400);
  const chunks = [];
  let n = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      n += r.value.byteLength;
      if (n > 16384) {
        void reader.cancel().catch(() => {});
        fail("body_too_large", "Limite de 16 KiB.", 413);
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(n);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("invalid_json", "JSON ou UTF-8 inválido.", 400);
  }
}
export function errorResponse(e, id) {
  const known = e instanceof DomainError;
  return Response.json(
    {
      code: known ? e.code : "internal_error",
      message: known ? e.message : "O serviço não concluiu. Tente novamente.",
      request_id: id,
    },
    { status: known ? e.status : 500 },
  );
}
export function guarded(handler) {
  return async (req) => {
    const id = crypto.randomUUID();
    let r;
    try {
      const u = new URL(req.url),
        origin = req.headers.get("origin");
      if (origin && origin !== u.origin)
        fail("origin_denied", "Origem não autorizada.", 403);
      r = await handler(req);
    } catch (e) {
      r = errorResponse(e, id);
    }
    const h = new Headers(r.headers);
    h.set("cache-control", "no-store");
    h.set("x-content-type-options", "nosniff");
    h.set("referrer-policy", "no-referrer");
    h.set("x-request-id", id);
    return new Response(r.body, { status: r.status, headers: h });
  };
}
