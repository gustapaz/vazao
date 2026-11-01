export type Saved = {
  id: string;
  title: string;
  input: any;
  result: any;
  revision: number;
  published: boolean;
  expires_at: number;
  opens_at: number;
  locked: boolean;
  server_time: number;
};
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function client(slug: string) {
  let current: Saved | undefined,
    token = "";
  const key = slug + "-tab-access";
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "[]") as {
        id: string;
        token: string;
        title: string;
      }[];
    } catch {
      return [];
    }
  };
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
    auth = token,
  ) {
    let r: Response;
    try {
      r = await fetch(path, {
        method,
        headers: {
          ...(body ? { "content-type": "application/json" } : {}),
          ...(auth ? { authorization: "Bearer " + auth } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(
        "network",
        "Sem conexão. Suas alterações continuam nesta tela.",
        0,
      );
    }
    const value = await r.json();
    if (!r.ok)
      throw new ApiError(
        value.code ?? "server",
        value.message ?? "O serviço não concluiu.",
        r.status,
      );
    return value;
  }
  const remember = () => {
    if (!current || !token) return;
    const all = [
      { id: current.id, token, title: current.title },
      ...read().filter((x) => x.id !== current!.id),
    ].slice(0, 12);
    try {
      sessionStorage.setItem(key, JSON.stringify(all));
    } catch {}
  };
  return {
    api,
    catalog: () => api("/api/catalog"),
    compute: (input: unknown) => api("/api/compute", "POST", input),
    get current() {
      return current;
    },
    get owns() {
      return !!token;
    },
    archive: read,
    async save(title: string, input: unknown) {
      const own = !!current && !!token;
      const v = await api(
        own ? "/api/records/" + current!.id : "/api/records",
        own ? "PUT" : "POST",
        {
          title,
          input,
          ...(own ? { expected_revision: current!.revision } : {}),
        },
      );
      current = v.record;
      if (v.token) token = v.token;
      remember();
      return current!;
    },
    async open(id: string) {
      token = read().find((x) => x.id === id)?.token ?? "";
      current = (await api("/api/records/" + encodeURIComponent(id))).record;
      return current!;
    },
    async share(published = true) {
      if (!current) throw new Error("Guarde antes de compartilhar.");
      current = (
        await api("/api/records/" + current.id + "/publish", "POST", {
          expected_revision: current.revision,
          published,
        })
      ).record;
      return location.origin + "/?record=" + current!.id;
    },
    async export() {
      if (!current) throw new Error("Guarde antes de exportar.");
      const r = await fetch("/api/records/" + current.id + "/export", {
        headers: token ? { authorization: "Bearer " + token } : {},
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.message);
      }
      const blob = await r.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        r.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? slug + "-export.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    fresh() {
      current = undefined;
      token = "";
      history.replaceState(null, "", location.pathname);
    },
  };
}
export function motionToggle(onChange: (v: boolean) => void) {
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const b = document.querySelector<HTMLButtonElement>("#motion-toggle");
  const set = () => {
    document.documentElement.classList.toggle("reduced-motion", paused);
    if (b) {
      b.setAttribute("aria-pressed", String(paused));
      b.textContent = paused ? "Movimento pausado" : "Pausar movimento";
    }
    onChange(paused);
  };
  b?.addEventListener("click", () => {
    paused = !paused;
    set();
  });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    (e) => {
      paused = e.matches;
      set();
    },
  );
  set();
}
