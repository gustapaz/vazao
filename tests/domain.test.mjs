import { test } from "node:test";
import assert from "node:assert/strict";
import { service } from "../server/service.mjs";

function cutOracle(r) {
  const ids = r.nodes.map((n) => n.id),
    s = ids.indexOf("S"),
    t = ids.indexOf("T");
  let best = Infinity;
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    if (!((mask >> s) & 1) || (mask >> t) & 1) continue;
    const value = r.edges
      .filter(
        (e) =>
          (mask >> ids.indexOf(e.from)) & 1 &&
          !((mask >> ids.indexOf(e.to)) & 1),
      )
      .reduce((a, e) => a + e.capacity, 0);
    best = Math.min(best, value);
  }
  return best;
}
test("max flow equals independently enumerated minimum cuts", () => {
  for (const p of service.meta.presets) {
    const r = service.compute(p.input);
    assert.equal(r.max_flow, cutOracle(r));
    assert.equal(r.cut_capacity, r.max_flow);
  }
});
test("flow capacity and conservation hold at every intermediate node", () => {
  for (const p of service.meta.presets) {
    const r = service.compute(p.input);
    assert.ok(r.edges.every((e) => e.flow >= 0 && e.flow <= e.capacity));
    for (const n of r.nodes.filter((n) => !["S", "T"].includes(n.id))) {
      assert.equal(
        r.edges.filter((e) => e.to === n.id).reduce((s, e) => s + e.flow, 0),
        r.edges.filter((e) => e.from === n.id).reduce((s, e) => s + e.flow, 0),
      );
    }
  }
});
test("closing every valve produces zero flow", () => {
  const p = {
    ...service.meta.default_input,
    closed_edges: Array.from({ length: 8 }, (_, i) => "e" + (i + 1)),
  };
  assert.equal(service.compute(p).max_flow, 0);
});
test("additional capacity never reduces optimal flow", () => {
  const p = service.meta.default_input;
  assert.ok(
    service.compute({ ...p, boost: 8 }).max_flow >= service.compute(p).max_flow,
  );
});
test("augmentations sum exactly to the final flow and export is deterministic", () => {
  const p = service.meta.default_input,
    r = service.compute(p);
  assert.equal(
    r.augmentations.reduce((s, x) => s + x.amount, 0),
    r.max_flow,
  );
  assert.deepEqual(service.export(p), service.export(p));
});
test("duplicate valves fractional boosts and extra fields rejected", () => {
  for (const x of [
    { closed_edges: ["e1", "e1"] },
    { boost: 0.5 },
    { network: "real" },
    { extra: 1 },
  ])
    assert.throws(() =>
      service.compute({ ...service.meta.default_input, ...x }),
    );
});
