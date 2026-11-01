import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { createApi } from "../server/api.mjs";
import { service } from "../server/service.mjs";
let mf, db, api, dir, time;
const input = service.meta.default_input,
  slug = service.meta.slug,
  base = "https://" + slug + ".test";
const runtime = () =>
  new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: "2026-05-15",
    d1Databases: { DB: slug + "-tests" },
    d1Persist: dir,
  });
before(async () => {
  dir = await mkdtemp(join(tmpdir(), slug + "-tests-"));
  mf = runtime();
  db = await mf.getD1Database("DB");
  for (const file of (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of (
      await readFile(new URL("../drizzle/" + file, import.meta.url), "utf8")
    )
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
});
beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM records"),
    db.prepare("DELETE FROM quotas"),
  ]);
  time = 2000000000;
  api = createApi(db, () => time);
});
after(async () => {
  await mf.dispose();
  const p = resolve(dir);
  if (
    !p.startsWith(resolve(tmpdir()) + sep) ||
    !basename(p).startsWith(slug + "-tests-")
  )
    throw new Error("Unsafe test cleanup");
  await rm(p, { recursive: true, force: true });
});
async function request(path, method = "GET", body, token, headers = {}) {
  const r = await api(
    new Request(base + path, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  return {
    status: r.status,
    body: r.headers.get("content-type")?.includes("json")
      ? await r.json()
      : await r.text(),
    headers: r.headers,
  };
}
async function create() {
  const r = await request("/api/records", "POST", {
    title: "Estudo sintético",
    input,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
test("real domain and DB health; catalog and compute", async () => {
  assert.equal((await request("/api/health")).body.domain_check, true);
  assert.equal((await request("/api/catalog")).body.slug, slug);
  assert.equal((await request("/api/compute", "POST", input)).status, 200);
});
test("private by default and only digest stored", async () => {
  const a = await create();
  assert.equal(a.record.published, false);
  assert.equal((await request("/api/records/" + a.record.id)).status, 404);
  assert.equal(
    (await request("/api/records/" + a.record.id, "GET", undefined, a.token))
      .status,
    200,
  );
  const row = await db.prepare("SELECT * FROM records").first();
  assert.notEqual(row.token_hash, a.token);
  assert.ok(!JSON.stringify(row).includes(a.token));
});
test("another resource token cannot read edit publish delete or export", async () => {
  const a = await create(),
    b = await create(),
    path = "/api/records/" + a.record.id;
  for (const [tail, method, body] of [
    ["", "GET"],
    ["", "PUT", { title: "Attack", input, expected_revision: 1 }],
    ["/publish", "POST", { expected_revision: 1, published: true }],
    ["", "DELETE"],
    ["/export", "GET"],
  ])
    assert.equal(
      (await request(path + tail, method, body, b.token)).status,
      404,
    );
});
test("edit persisted; old revision conflicts", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id,
    body = { title: "New title", input, expected_revision: 1 };
  assert.equal(
    (await request(path, "PUT", body, a.token)).body.record.revision,
    2,
  );
  assert.equal((await request(path, "PUT", body, a.token)).status, 409);
  assert.equal(
    (await request(path, "GET", undefined, a.token)).body.record.title,
    "New title",
  );
});
test("concurrent CAS produces exactly one winner", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id;
  const r = await Promise.all(
    ["A", "B"].map((title) =>
      request(path, "PUT", { title, input, expected_revision: 1 }, a.token),
    ),
  );
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
  assert.equal(
    (await request(path, "GET", undefined, a.token)).body.record.revision,
    2,
  );
});
test("publish enables read-only access; real export uses saved record", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id;
  assert.equal(
    (
      await request(
        path + "/publish",
        "POST",
        { expected_revision: 1, published: true },
        a.token,
      )
    ).body.record.revision,
    2,
  );
  assert.equal((await request(path)).status, 200);
  assert.equal(
    (
      await request(path, "PUT", {
        title: "Attack",
        input,
        expected_revision: 2,
      })
    ).status,
    404,
  );
  if (slug === "postera") {
    assert.equal((await request(path + "/export")).status, 423);
    time += input.delay_seconds;
  }
  const out = await request(path + "/export");
  assert.equal(out.status, 200);
  assert.ok(out.headers.get("content-disposition").includes("attachment"));
  assert.ok(
    (typeof out.body === "string" ? out.body : JSON.stringify(out.body))
      .length > 20,
  );
  if (slug !== "postera") {
    assert.equal(
      (
        await request(
          path + "/publish",
          "POST",
          { expected_revision: 2, published: false },
          a.token,
        )
      ).status,
      200,
    );
    assert.equal((await request(path)).status, 404);
  }
});
test("visibility also requires current revision", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id;
  await request(
    path,
    "PUT",
    { title: "New", input, expected_revision: 1 },
    a.token,
  );
  assert.equal(
    (
      await request(
        path + "/publish",
        "POST",
        { expected_revision: 1, published: true },
        a.token,
      )
    ).status,
    409,
  );
});
test("expiry blocks both public and owner access", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id;
  await request(
    path + "/publish",
    "POST",
    { expected_revision: 1, published: true },
    a.token,
  );
  time += 604800;
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, "GET", undefined, a.token)).status, 404);
  assert.equal(
    (await request(path + "/export", "GET", undefined, a.token)).status,
    404,
  );
});
test("delete only revokes own record", async () => {
  const a = await create(),
    b = await create();
  assert.equal(
    (await request("/api/records/" + a.record.id, "DELETE", undefined, a.token))
      .status,
    200,
  );
  assert.equal(
    (await request("/api/records/" + a.record.id, "GET", undefined, a.token))
      .status,
    404,
  );
  assert.equal(
    (await request("/api/records/" + b.record.id, "GET", undefined, b.token))
      .status,
    200,
  );
});
test("global creation quota atomic and next hour resets", async () => {
  const r = await Promise.all(
    Array.from({ length: 14 }, () =>
      request("/api/records", "POST", { title: "Synthetic", input }),
    ),
  );
  assert.equal(r.filter((x) => x.status === 201).length, 12);
  assert.equal(r.filter((x) => x.status === 429).length, 2);
  time += 3600;
  assert.equal((await create()).record.revision, 1);
});
test("title and domain strictly validated", async () => {
  assert.equal(
    (await request("/api/records", "POST", { title: "", input })).status,
    422,
  );
  assert.equal(
    (
      await request("/api/records", "POST", {
        title: "Valid",
        input,
        unexpected: 1,
      })
    ).status,
    422,
  );
  assert.equal((await request("/api/compute", "POST", {})).status, 422);
});
test("stream size media UTF8 and origin guards", async () => {
  assert.equal(
    (await request("/api/compute", "POST", { x: "x".repeat(17000) })).status,
    413,
  );
  assert.equal(
    (
      await request("/api/compute", "POST", {}, undefined, {
        "content-type": "text/plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await request("/api/health", "GET", undefined, undefined, {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  const r = await api(
    new Request(base + "/api/compute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new Uint8Array([255]),
    }),
  );
  assert.equal(r.status, 400);
  assert.equal(
    (await request("/api/health")).headers.get("cache-control"),
    "no-store",
  );
});
test("revision limit bounded at thirty", async () => {
  const a = await create(),
    path = "/api/records/" + a.record.id;
  for (let rev = 1; rev < 30; rev++)
    assert.equal(
      (
        await request(
          path,
          "PUT",
          { title: "Revision " + rev, input, expected_revision: rev },
          a.token,
        )
      ).status,
      200,
    );
  assert.equal(
    (
      await request(
        path,
        "PUT",
        { title: "Limit", input, expected_revision: 30 },
        a.token,
      )
    ).status,
    409,
  );
});
test("record survives runtime disposal and reopening", async () => {
  const a = await create();
  await mf.dispose();
  mf = runtime();
  db = await mf.getD1Database("DB");
  api = createApi(db, () => time);
  assert.equal(
    (await request("/api/records/" + a.record.id, "GET", undefined, a.token))
      .body.record.title,
    a.record.title,
  );
});
if (slug === "postera")
  test("sealed message hidden even from owner, immutable, opens by server clock", async () => {
    const a = await create(),
      path = "/api/records/" + a.record.id;
    time += 1000;
    const published = await request(
      path + "/publish",
      "POST",
      { expected_revision: 1, published: true },
      a.token,
    );
    assert.equal(published.body.record.opens_at, time + input.delay_seconds);
    assert.equal(published.body.record.expires_at, time + 604800);
    for (const auth of [undefined, a.token]) {
      const r = await request(path, "GET", undefined, auth);
      assert.equal(r.body.record.input.message, null);
      assert.ok(!JSON.stringify(r.body).includes(input.message));
    }
    assert.equal(
      (
        await request(
          path,
          "PUT",
          { title: "Cannot edit", input, expected_revision: 2 },
          a.token,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          path + "/publish",
          "POST",
          { expected_revision: 2, published: false },
          a.token,
        )
      ).status,
      409,
    );
    time += input.delay_seconds;
    const r = await request(path);
    assert.equal(r.body.record.locked, false);
    assert.equal(r.body.record.input.message, input.message);
  });
