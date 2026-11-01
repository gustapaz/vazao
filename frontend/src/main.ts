import * as b from "../../node_modules/bobril/index.ts";
import { model } from "./model";
import { canvasStage } from "./canvas";
import { motionToggle } from "./client";
const stage = canvasStage(
  document.querySelector<HTMLCanvasElement>("#pipes")!,
  (c, w, h, t, r) => {
    c.clearRect(0, 0, w, h);
    if (!r) return false;
    const point = (id: string) => {
      const n = r.nodes.find((n: any) => n.id === id);
      return { x: 35 + (n.x / 100) * (w - 70), y: 25 + (n.y / 100) * (h - 50) };
    };
    r.edges.forEach((e: any, i: number) => {
      const a = point(e.from),
        z = point(e.to),
        dx = z.x - a.x,
        dy = z.y - a.y,
        len = Math.hypot(dx, dy),
        nx = -dy / len,
        ny = dx / len,
        offset = (i % 2 ? 1 : -1) * 7;
      c.strokeStyle = e.cut
        ? "#f5ff80"
        : e.capacity
          ? "#96b1ff66"
          : "#edf2ff22";
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(z.x, z.y);
      c.stroke();
      if (e.flow) {
        c.strokeStyle = "#cbdcff";
        c.lineWidth = 3;
        c.setLineDash([2, 18]);
        c.lineDashOffset = t ? -t / 50 : 0;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(z.x, z.y);
        c.stroke();
        c.setLineDash([]);
      }
      c.fillStyle = "#fff";
      c.font = "11px monospace";
      c.textAlign = "center";
      c.fillText(
        e.id + "  " + e.flow + "/" + e.capacity,
        (a.x + z.x) / 2 + nx * 22,
        (a.y + z.y) / 2 + ny * 22,
      );
      const q = 0.65,
        x = a.x + dx * q,
        y = a.y + dy * q;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - (dx / len) * 9 + nx * 5, y - (dy / len) * 9 + ny * 5);
      c.lineTo(x - (dx / len) * 9 - nx * 5, y - (dy / len) * 9 - ny * 5);
      c.closePath();
      c.fill();
    });
    r.nodes.forEach((n: any) => {
      const p = point(n.id);
      c.beginPath();
      c.arc(p.x, p.y, 22, 0, Math.PI * 2);
      c.fillStyle = r.reachable.includes(n.id) ? "#f5ff80" : "#e7edff";
      c.fill();
      c.fillStyle = "#1232a3";
      c.font = "bold 17px monospace";
      c.textAlign = "center";
      c.fillText(n.id, p.x, p.y + 6);
    });
    return r.max_flow > 0;
  },
);
const a = model(
    "vazao",
    () => b.invalidate(),
    (r) => stage.set(r),
  ),
  d = a.d;
const n = (
  tag: string,
  children: any = [],
  attrs: any = {},
  component: any = undefined,
): any => ({ tag, children, attrs, component });
const btn = (text: string, fn: () => any, disabled = false) =>
  n(
    "button",
    text,
    { disabled: d.busy || disabled },
    {
      onClick: () => {
        fn();
        return true;
      },
    },
  );
const change = (fn: (v: any) => void) => ({
  onChange: (_ctx: any, v: any) => fn(v),
});
const label = (text: string, control: any) => n("label", [text, control]);
function view() {
  return n("div", [
    n(
      "div",
      [
        n("span", "FECHAR UMA VÁLVULA MUDA O SISTEMA."),
        n("h1", ["Encontre o ", n("em", "limite.")]),
      ],
      { class: "headline" },
    ),
    d.catalog
      ? n(
          "div",
          [
            label(
              "Rede",
              n(
                "select",
                Object.keys(d.catalog.networks).map((x) =>
                  n("option", x.toUpperCase(), { value: x }),
                ),
                {
                  "aria-label": "Rede",
                  value: d.input.network,
                  disabled: d.busy,
                },
                change((v) => a.change("network", v)),
              ),
            ),
            label(
              "Aresta reforçada",
              n(
                "select",
                Array.from({ length: 8 }, (_, i) =>
                  n("option", "e" + (i + 1), { value: "e" + (i + 1) }),
                ),
                {
                  "aria-label": "Aresta reforçada",
                  value: d.input.boost_edge,
                  disabled: d.busy,
                },
                change((v) => a.change("boost_edge", v)),
              ),
            ),
            label(
              "Reforço: " + d.input.boost,
              n(
                "input",
                [],
                {
                  type: "range",
                  min: 0,
                  max: 8,
                  value: d.input.boost,
                  "aria-label": "Reforço",
                  disabled: d.busy,
                },
                change((v) => a.change("boost", +v)),
              ),
            ),
            btn("Calcular fluxo ↗", () => a.run()),
          ],
          { class: "command" },
        )
      : btn("Tentar conectar", () => a.init()),
    n("p", d.error || d.status, { role: "status", class: "status" }),
    d.result
      ? n(
          "div",
          [
            n("strong", String(d.result.max_flow)),
            n("span", [
              "UNIDADES / CICLO",
              n(
                "small",
                "Corte mínimo = " +
                  d.result.cut_capacity +
                  " · " +
                  d.result.iterations +
                  " aumentos",
              ),
            ]),
          ],
          { class: "meter" },
        )
      : null,
    d.catalog
      ? n(
          "div",
          [
            n("h2", "VÁLVULAS / selecione para fechar"),
            ...Array.from({ length: 8 }, (_, i) => {
              const id = "e" + (i + 1),
                closed = d.input.closed_edges.includes(id);
              const x = btn(id + " · " + (closed ? "fechada" : "aberta"), () =>
                a.change(
                  "closed_edges",
                  closed
                    ? d.input.closed_edges.filter((v: string) => v !== id)
                    : [...d.input.closed_edges, id],
                ),
              );
              x.attrs["aria-pressed"] = closed;
              x.key = id;
              return x;
            }),
          ],
          { class: "valves" },
        )
      : null,
    d.catalog
      ? n(
          "div",
          d.catalog.presets.map((p: any) =>
            btn(p.name + " ↗", () => a.preset(p)),
          ),
          { class: "presets" },
        )
      : null,
    d.result
      ? n("details", [
          n("summary", "Certificado de fluxo e corte"),
          n(
            "p",
            "Lado alcançável: " +
              d.result.reachable.join(", ") +
              ". O amarelo indica o corte mínimo.",
          ),
          n("table", [
            n("caption", "Capacidade e fluxo por aresta"),
            n(
              "thead",
              n(
                "tr",
                ["Aresta", "Direção", "Fluxo", "Capacidade", "Corte"].map((x) =>
                  n("th", x, { scope: "col" }),
                ),
              ),
            ),
            n(
              "tbody",
              d.result.edges.map((e: any) =>
                n(
                  "tr",
                  [
                    e.id,
                    e.from + " → " + e.to,
                    e.flow,
                    e.capacity,
                    e.cut ? "sim" : "—",
                  ].map((x) => n("td", String(x))),
                ),
              ),
            ),
          ]),
        ])
      : null,
    n(
      "details",
      [
        n("summary", "Guardar esta rede"),
        label(
          "Nome da rede",
          n(
            "input",
            [],
            { value: d.title, maxLength: 48, "aria-label": "Nome da rede" },
            change((v) => a.title(v)),
          ),
        ),
        btn(
          d.current && d.owns ? "Salvar alterações" : "Guardar rede",
          () => a.save(),
          !d.result,
        ),
        d.current
          ? n("div", [
              btn("Reler do banco", () => a.open(d.current.id)),
              btn("Exportar JSON", () => a.download()),
              d.owns
                ? btn(
                    d.current.published ? "Encerrar link" : "Criar link",
                    () => a.share(),
                  )
                : null,
              btn("Nova rede", () => a.fresh()),
            ])
          : null,
        d.link
          ? n("a", "Abrir rede compartilhada ↗", {
              href: d.link,
              target: "_blank",
              rel: "noreferrer",
            })
          : null,
        n("p", "Demo abstrata · retenção de 7 dias · edição nesta aba."),
        ...d.archive.map((x: any) => btn(x.title + " ↗", () => a.open(x.id))),
      ],
      { class: "archive" },
    ),
    n(
      "p",
      "Capacidade abstrata. Não dimensiona tubulações, pressão ou instalações reais.",
      { class: "note" },
    ),
  ]);
}
const host = document.querySelector<HTMLElement>("#app-root")!;
host.replaceChildren();
b.init(view, host);
// Bobril's import-time DOM-ready gate can miss the event after hydration.
// Reinitialization consumes its reset gate before the first render frame.
if (document.readyState !== "loading") b.init(view, host);
motionToggle((v) => stage.pause(v));
void a.init();
