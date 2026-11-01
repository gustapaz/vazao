import { client } from "./client";
export function model(
  slug: string,
  notify: () => void,
  paint: (result: any) => void = () => {},
) {
  const api = client(slug),
    d: any = {
      catalog: null,
      input: null,
      result: null,
      title: "Sem título",
      busy: false,
      status: "Preparando a experiência…",
      error: "",
      link: "",
      confirmed: "",
      archive: [],
      current: null,
      owns: false,
    };
  const update = () => {
    d.current = api.current;
    d.owns = api.owns;
    d.archive = api.archive();
    notify();
  };
  const task = async (fn: () => Promise<void>) => {
    if (d.busy) return;
    d.busy = true;
    d.error = "";
    update();
    try {
      await fn();
    } catch (e: any) {
      d.error = e?.message || "O serviço não respondeu. Tente novamente.";
    } finally {
      d.busy = false;
      update();
    }
  };
  const set = (r: any) => {
    d.result = r;
    d.confirmed = JSON.stringify(d.input);
    paint(r);
  };
  const open = async (id: string) => {
    const r = await api.open(id);
    d.input = structuredClone(r.input);
    d.title = r.title;
    set(r.result);
    d.link = r.published ? location.origin + "/?record=" + r.id : "";
    d.status = api.owns
      ? "Relido do banco · revisão " + r.revision
      : "Link público de leitura. Crie uma cópia para guardar mudanças.";
  };
  const a = {
    d,
    api,
    init: () =>
      task(async () => {
        d.catalog = await api.catalog();
        d.input = structuredClone(d.catalog.default_input);
        d.title = d.catalog.title + " · estudo";
        const id = new URL(location.href).searchParams.get("record");
        if (id) await open(id);
        else {
          set(await api.compute(d.input));
          d.status = "Pronto para experimentar.";
        }
      }),
    change: (key: string, value: any) => {
      if (JSON.stringify(d.input?.[key]) === JSON.stringify(value)) return;
      d.input = { ...d.input, [key]: value };
      d.status = "Alterações pendentes de calcular e guardar.";
      update();
    },
    title: (value: string) => {
      d.title = value;
    },
    run: () =>
      task(async () => {
        set(await api.compute(d.input));
        d.status = "Calculado no servidor.";
      }),
    preset: (p: any) =>
      task(async () => {
        api.fresh();
        d.input = structuredClone(p.input);
        d.link = "";
        set(await api.compute(d.input));
        d.status = "Exemplo aplicado. Guarde para criar um link.";
      }),
    open: (id: string) => task(() => open(id)),
    save: () =>
      task(async () => {
        if (JSON.stringify(d.input) !== d.confirmed)
          throw new Error("Calcule as alterações antes de guardar.");
        const r = await api.save(d.title, d.input);
        d.status = "Guardado no banco · revisão " + r.revision;
      }),
    share: () =>
      task(async () => {
        if (!api.current) throw new Error("Guarde antes de criar o link.");
        if (
          JSON.stringify(api.current.input) !== JSON.stringify(d.input) ||
          api.current.title !== d.title
        )
          throw new Error("Guarde as alterações antes de compartilhar.");
        d.link = await api.share(!api.current.published);
        if (!api.current?.published) d.link = "";
        d.status = d.link
          ? "Link público de leitura criado."
          : "Link encerrado. Estudo privado.";
      }),
    download: () =>
      task(async () => {
        await api.export();
        d.status = "Arquivo da revisão salva exportado.";
      }),
    fresh: () => {
      if (d.busy || !d.catalog) return;
      api.fresh();
      d.input = structuredClone(d.catalog.default_input);
      d.title = d.catalog.title + " · estudo";
      d.result = null;
      d.confirmed = "";
      d.link = "";
      d.status = "Novo estudo; o anterior foi preservado.";
      paint(null);
      update();
    },
    dirty: () => JSON.stringify(d.input) !== d.confirmed,
  };
  return a;
}
