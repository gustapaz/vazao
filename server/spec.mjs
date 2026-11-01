import { inputSchema } from "./input-schema.mjs";
export function specification(service) {
  const payload = { ...inputSchema, example: service.meta.default_input };
  const record = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      title: { type: "string" },
      input: payload,
      result: { type: "object" },
      revision: { type: "integer", minimum: 1, maximum: 30 },
      published: { type: "boolean" },
      locked: { type: "boolean" },
      created_at: { type: "integer" },
      updated_at: { type: "integer" },
      expires_at: { type: "integer" },
      opens_at: { type: "integer" },
      server_time: { type: "integer" },
    },
  };
  const response = (schema) => ({
      description: "Resposta real do servidor.",
      content: { "application/json": { schema } },
    }),
    errors = Object.fromEntries(
      [400, 403, 404, 409, 413, 415, 422, 423, 429, 500].map((n) => [
        n,
        response({
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            request_id: { type: "string" },
          },
        }),
      ]),
    );
  const req = (schema) => ({
    required: true,
    content: { "application/json": { schema } },
  });
  const op = (
    summary,
    input,
    auth = false,
    schema = { type: "object" },
    status = 200,
  ) => ({
    summary,
    ...(auth ? { security: [{ resource: [] }] } : {}),
    ...(input ? { requestBody: req(input) } : {}),
    responses: { [status]: response(schema), ...errors },
  });
  const object = (properties) => ({
      type: "object",
      additionalProperties: false,
      required: Object.keys(properties),
      properties,
    }),
    title = { type: "string", minLength: 1, maxLength: 48 },
    rev = { type: "integer", minimum: 1, maximum: 30 },
    piece = { type: "object", properties: { record } };
  return {
    openapi: "3.0.3",
    info: {
      title: service.meta.title + " API",
      version: "1.0.0",
      description:
        service.meta.note +
        " Entradas 16 KiB, 12 criações/hora UTC, 30 revisões, TTL 7 dias. Token por recurso de 256 bits, só digest no banco.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        resource: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "demo_<64 hex>",
        },
      },
      schemas: { Input: payload, Record: record },
    },
    paths: {
      "/api/health": { get: op("Verificar domínio e banco") },
      "/api/catalog": { get: op("Catálogo autoral e parâmetros de partida") },
      "/api/compute": { post: op("Calcular o domínio sem persistir", payload) },
      "/api/records": {
        post: op(
          "Criar registro privado e receber token uma vez",
          object({ title, input: payload }),
          false,
          { type: "object", properties: { record, token: { type: "string" } } },
          201,
        ),
      },
      "/api/records/{id}": {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        get: op("Ler registro público ou próprio", null, false, piece),
        put: op(
          "Atualizar com revisão esperada",
          object({ title, input: payload, expected_revision: rev }),
          true,
          piece,
        ),
        delete: op("Revogar e excluir somente o próprio recurso", null, true),
      },
      "/api/records/{id}/publish": {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        post: op(
          "Compartilhar leitura por revisão",
          object({ expected_revision: rev, published: { type: "boolean" } }),
          true,
          piece,
        ),
      },
      "/api/records/{id}/export": {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        get: {
          summary: "Exportar resultado salvo, com autorização da leitura",
          responses: {
            200: {
              description: "Arquivo derivado do domínio, da revisão salva.",
            },
            ...errors,
          },
        },
      },
    },
  };
}
