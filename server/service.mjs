import { validateInput } from "./validator.mjs";
import { fail } from "./errors.mjs";
const node = (id, x, y) => ({ id, x, y });
export const networks = {
  delta: {
    nodes: [
      node("S", 8, 50),
      node("A", 35, 18),
      node("B", 35, 82),
      node("C", 66, 50),
      node("T", 94, 50),
    ],
    edges: [
      ["S", "A", 7],
      ["S", "B", 5],
      ["A", "B", 3],
      ["A", "C", 4],
      ["B", "C", 5],
      ["B", "T", 2],
      ["C", "T", 8],
      ["S", "C", 2],
    ],
  },
  loop: {
    nodes: [
      node("S", 8, 50),
      node("A", 35, 18),
      node("B", 65, 18),
      node("C", 50, 82),
      node("T", 94, 50),
    ],
    edges: [
      ["S", "A", 8],
      ["S", "C", 4],
      ["A", "B", 6],
      ["B", "C", 3],
      ["C", "A", 2],
      ["A", "T", 3],
      ["B", "T", 4],
      ["C", "T", 5],
    ],
  },
  cascade: {
    nodes: [
      node("S", 6, 50),
      node("A", 32, 18),
      node("B", 32, 82),
      node("C", 65, 18),
      node("D", 65, 82),
      node("T", 94, 50),
    ],
    edges: [
      ["S", "A", 8],
      ["S", "B", 6],
      ["A", "C", 5],
      ["A", "D", 4],
      ["B", "D", 6],
      ["C", "T", 6],
      ["D", "T", 7],
      ["B", "C", 2],
    ],
  },
};
export const meta = {
  slug: "vazao",
  title: "VAZÃO",
  engine: "worktop-typebox-maxflow",
  networks,
  default_input: {
    network: "delta",
    boost_edge: "e3",
    boost: 0,
    closed_edges: [],
  },
  presets: [
    {
      name: "Delta",
      input: { network: "delta", boost_edge: "e3", boost: 0, closed_edges: [] },
    },
    {
      name: "Circuito",
      input: { network: "loop", boost_edge: "e6", boost: 2, closed_edges: [] },
    },
    {
      name: "Cascata",
      input: {
        network: "cascade",
        boost_edge: "e7",
        boost: 0,
        closed_edges: ["e4"],
      },
    },
  ],
  note: "Rede dirigida abstrata. Capacidades em unidades por ciclo, não pressão, vazão física ou dimensionamento hidráulico. Algoritmo Edmonds–Karp e certificado por corte mínimo.",
};
export function validate(raw) {
  const p = validateInput(raw);
  if (new Set(p.closed_edges).size !== p.closed_edges.length)
    fail("invalid_input", "Não repita válvulas fechadas.");
  return p;
}
export function compute(raw) {
  const p = validate(raw),
    network = networks[p.network],
    ids = network.nodes.map((n) => n.id),
    n = ids.length,
    s = ids.indexOf("S"),
    t = ids.indexOf("T"),
    edges = network.edges.map(([from, to, capacity], i) => ({
      id: "e" + (i + 1),
      from,
      to,
      capacity: p.closed_edges.includes("e" + (i + 1))
        ? 0
        : capacity + (p.boost_edge === "e" + (i + 1) ? p.boost : 0),
    })),
    residual = Array.from({ length: n }, () => Array(n).fill(0));
  for (const e of edges)
    residual[ids.indexOf(e.from)][ids.indexOf(e.to)] = e.capacity;
  let max_flow = 0,
    iterations = 0;
  const augmentations = [];
  while (true) {
    const parent = Array(n).fill(-1),
      queue = [s];
    parent[s] = s;
    for (let k = 0; k < queue.length && parent[t] < 0; k++) {
      const u = queue[k];
      for (let v = 0; v < n; v++)
        if (parent[v] < 0 && residual[u][v] > 0) {
          parent[v] = u;
          queue.push(v);
        }
    }
    if (parent[t] < 0) break;
    let amount = Infinity;
    for (let v = t; v !== s; v = parent[v])
      amount = Math.min(amount, residual[parent[v]][v]);
    const path = [ids[t]];
    for (let v = t; v !== s; v = parent[v]) {
      const u = parent[v];
      residual[u][v] -= amount;
      residual[v][u] += amount;
      path.unshift(ids[u]);
    }
    max_flow += amount;
    iterations++;
    augmentations.push({ path, amount });
  }
  const reachable = new Set([s]),
    queue = [s];
  for (let k = 0; k < queue.length; k++)
    for (let v = 0; v < n; v++)
      if (!reachable.has(v) && residual[queue[k]][v] > 0) {
        reachable.add(v);
        queue.push(v);
      }
  const final = edges.map((e) => ({
    ...e,
    flow: e.capacity - residual[ids.indexOf(e.from)][ids.indexOf(e.to)],
    cut:
      reachable.has(ids.indexOf(e.from)) && !reachable.has(ids.indexOf(e.to)),
  }));
  return {
    nodes: network.nodes,
    edges: final,
    max_flow,
    cut_capacity: final
      .filter((e) => e.cut)
      .reduce((s, e) => s + e.capacity, 0),
    reachable: [...reachable].map((i) => ids[i]),
    iterations,
    augmentations,
    units: "unidades/ciclo",
  };
}
export function exportResult(input) {
  return {
    type: "application/json; charset=utf-8",
    extension: "json",
    text: JSON.stringify({ input, result: compute(input) }, null, 2),
  };
}
export const service = { meta, validate, compute, export: exportResult };
