import ClientBoot from "./client-boot";
export default function Home() {
  return (
    <>
      <a className="skip" href="#app-root">
        Ir aos comandos
      </a>
      <header>
        <a href="/" className="brand">
          VAZÃO<span>REDES EM MOVIMENTO</span>
        </a>
        <span>LAB / 05</span>
        <a href="/api-docs.html">O algoritmo ↗</a>
      </header>
      <main>
        <section className="network">
          <div className="diagram-label">
            <span>ORIGEM S → DESTINO T</span>
            <span>EDMONDS–KARP</span>
          </div>
          <canvas
            id="pipes"
            role="img"
            aria-label="Rede dirigida com fluxos e corte mínimo, detalhada na tabela"
          />
          <div className="diagram-foot">
            <span>FLUXO CONSERVADO EM CADA NÓ</span>
            <span>CAPACIDADE ≠ VELOCIDADE</span>
          </div>
        </section>
        <section id="app-root">
          <p>Conectando a rede…</p>
        </section>
      </main>
      <footer>
        <img
          src="/media/subject.webp"
          width="160"
          height="100"
          loading="lazy"
          alt="Tubulações reais usadas como referência visual"
        />
        <p>
          Uma experiência de Gustavo Paz.
          <br />O fluxo encontra o seu limite.
        </p>
        <a href="/credits.html">Créditos ↗</a>
        <a href="https://github.com/gustapaz/vazao">Código ↗</a>
        <button id="motion-toggle" aria-pressed="false">
          Pausar movimento
        </button>
      </footer>
      <ClientBoot />
    </>
  );
}
