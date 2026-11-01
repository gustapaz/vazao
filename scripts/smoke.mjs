import assert from "node:assert/strict";
const base = process.argv[2];
if (!base || !["http:", "https:"].includes(new URL(base).protocol))
  throw new Error("Use npm run smoke -- URL");
let id, token;
async function request(path, method = "GET", body, auth = token) {
  const r = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(auth ? { authorization: "Bearer " + auth } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: r.status,
    body: r.headers.get("content-type")?.includes("json")
      ? await r.json()
      : await r.text(),
  };
}
try {
  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.database, "ok");
  assert.equal(health.body.domain_check, true);
  const c = (await request("/api/catalog")).body;
  assert.equal(
    (await request("/api/compute", "POST", c.default_input)).status,
    200,
  );
  assert.equal(
    (await request("/api/compute", "POST", { ...c.default_input, extra: 1 }))
      .status,
    422,
  );
  const saved = await request("/api/records", "POST", {
    title: "Teste sintético de integração",
    input: c.default_input,
  });
  assert.equal(saved.status, 201);
  id = saved.body.record.id;
  token = saved.body.token;
  assert.match(token, /^demo_[a-f0-9]{64}$/);
  assert.equal(
    (await request("/api/records/" + id, "GET", undefined, "")).status,
    404,
  );
  assert.equal(
    (await request("/api/records/" + id)).body.record.title,
    "Teste sintético de integração",
  );
  const updated = await request("/api/records/" + id, "PUT", {
    title: "Teste integrado relido",
    input: c.default_input,
    expected_revision: 1,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.record.revision, 2);
  assert.equal(
    (
      await request("/api/records/" + id, "PUT", {
        title: "Revisão antiga",
        input: c.default_input,
        expected_revision: 1,
      })
    ).status,
    409,
  );
  assert.equal((await request("/api/records/" + id + "/export")).status, 200);
  const shared = await request("/api/records/" + id + "/publish", "POST", {
    expected_revision: 2,
    published: true,
  });
  assert.equal(shared.status, 200);
  const publicRecord = await request(
    "/api/records/" + id,
    "GET",
    undefined,
    "",
  );
  assert.equal(publicRecord.status, 200);
  assert.equal(publicRecord.body.record.published, true);
  assert.equal(
    (await request("/api/records/" + id + "/export", "GET", undefined, ""))
      .status,
    200,
  );
  assert.equal(
    (
      await request("/api/records/" + id + "/publish", "POST", {
        expected_revision: 3,
        published: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/records/" + id, "GET", undefined, "")).status,
    404,
  );
  assert.equal((await request("/api/openapi.json")).body.openapi, "3.0.3");
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/api-docs.html")).status, 200);
  console.log(
    JSON.stringify({
      project: c.slug,
      base,
      checks:
        "health, domínio, validação, persistência, isolamento, revisão/CAS, compartilhamento, exportação, HTML e OpenAPI",
      result: "passed",
    }),
  );
} finally {
  if (id && token) {
    assert.equal((await request("/api/records/" + id, "DELETE")).status, 200);
  }
}
