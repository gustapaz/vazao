import { fail, exact, integer, digest } from "./errors.mjs";
import { readJson } from "./transport.mjs";
export function createStore(
  db,
  service,
  clock = () => Math.floor(Date.now() / 1000),
) {
  function title(v) {
    if (
      typeof v !== "string" ||
      !v.trim() ||
      v.trim().length > 48 ||
      /[\u0000-\u001f\u007f]/.test(v)
    )
      fail("invalid_title", "Título de 1–48 caracteres.");
    return v.trim();
  }
  async function find(req, id, ownerOnly = false) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      fail("not_found", "Registro não encontrado ou expirado.", 404);
    const r = await db
      .prepare("SELECT * FROM records WHERE id=? AND expires_at>?")
      .bind(id, clock())
      .first();
    if (!r) fail("not_found", "Registro não encontrado ou expirado.", 404);
    const auth = req.headers.get("authorization"),
      own =
        !!auth &&
        /^Bearer demo_[a-f0-9]{64}$/.test(auth) &&
        (await digest(auth.slice(7))) === r.token_hash;
    if ((ownerOnly || !r.published) && !own)
      fail("not_found", "Registro não encontrado ou expirado.", 404);
    return { row: r, own };
  }
  function expose(r) {
    const input = JSON.parse(r.recipe);
    return {
      id: r.id,
      title: r.title,
      input,
      result: service.compute(input),
      revision: r.revision,
      published: !!r.published,
      created_at: r.created_at,
      updated_at: r.updated_at,
      expires_at: r.expires_at,
      opens_at: r.unlock_at,
      locked: false,
      server_time: clock(),
    };
  }
  return {
    async health() {
      await db.prepare("SELECT 1").first();
      service.compute(service.meta.default_input);
      return Response.json({
        status: "ok",
        database: "ok",
        engine: service.meta.engine,
        domain_check: true,
      });
    },
    catalog() {
      return Response.json(service.meta);
    },
    async compute(req) {
      return Response.json(
        await service.compute(service.validate(await readJson(req))),
      );
    },
    async create(req) {
      const b = await readJson(req);
      exact(b, ["title", "input"]);
      const name = title(b.title),
        input = service.validate(b.input);
      service.compute(input);
      const now = clock();
      await db.batch([
        db
          .prepare(
            "DELETE FROM records WHERE id IN (SELECT id FROM records WHERE expires_at<=? LIMIT 100)",
          )
          .bind(now),
        db.prepare("DELETE FROM quotas WHERE expires_at<=?").bind(now),
      ]);
      const q = await db
        .prepare(
          "INSERT INTO quotas(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<12 RETURNING count",
        )
        .bind(
          "create:" + Math.floor(now / 3600),
          (Math.floor(now / 3600) + 1) * 3600,
        )
        .first();
      if (!q)
        fail(
          "rate_limited",
          "12 criações nesta hora UTC. Tente na próxima hora.",
          429,
        );
      const token =
          "demo_" +
          [...crypto.getRandomValues(new Uint8Array(32))]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
        id = crypto.randomUUID();
      const row = await db
        .prepare(
          "INSERT INTO records(id,title,recipe,token_hash,revision,published,created_at,updated_at,expires_at,unlock_at) VALUES(?,?,?,?,1,0,?,?,?,0) RETURNING *",
        )
        .bind(
          id,
          name,
          JSON.stringify(input),
          await digest(token),
          now,
          now,
          now + 604800,
        )
        .first();
      return Response.json({ record: expose(row), token }, { status: 201 });
    },
    async get(req, id) {
      return Response.json({ record: expose((await find(req, id)).row) });
    },
    async update(req, id) {
      const { row } = await find(req, id, true);
      const b = await readJson(req);
      exact(b, ["title", "input", "expected_revision"]);
      const rev = integer(b.expected_revision, 1, 30),
        name = title(b.title),
        input = service.validate(b.input);
      const r = await db
        .prepare(
          "UPDATE records SET title=?,recipe=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND revision<30 AND expires_at>? RETURNING *",
        )
        .bind(name, JSON.stringify(input), clock(), id, rev, clock())
        .first();
      if (!r)
        fail(
          "revision_conflict",
          "A revisão mudou. Releia o registro antes de editar.",
          409,
        );
      return Response.json({ record: expose(r) });
    },
    async publish(req, id) {
      const { row } = await find(req, id, true);
      const b = await readJson(req);
      exact(b, ["expected_revision", "published"]);
      const rev = integer(b.expected_revision, 1, 30);
      if (typeof b.published !== "boolean")
        fail("invalid_input", "published deve ser boolean.");
      const opens = 0;
      const r = await db
        .prepare(
          "UPDATE records SET published=?,unlock_at=?,expires_at=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND revision<30 AND expires_at>? RETURNING *",
        )
        .bind(
          b.published ? 1 : 0,
          opens,
          row.expires_at,
          clock(),
          id,
          rev,
          clock(),
        )
        .first();
      if (!r)
        fail(
          "revision_conflict",
          "A revisão mudou. Releia antes de compartilhar.",
          409,
        );
      return Response.json({ record: expose(r) });
    },
    async export(req, id) {
      const { row } = await find(req, id);
      const output = service.export(JSON.parse(row.recipe));
      return new Response(output.bytes ?? output.text, {
        headers: {
          "content-type": output.type,
          "content-disposition": `attachment; filename="${service.meta.slug}-${id}.${output.extension}"`,
        },
      });
    },
    async remove(req, id) {
      await find(req, id, true);
      await db.prepare("DELETE FROM records WHERE id=?").bind(id).run();
      return Response.json({ deleted: true });
    },
  };
}
