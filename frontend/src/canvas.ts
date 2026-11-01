export function canvasStage(
  canvas: HTMLCanvasElement,
  draw: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    data: any,
  ) => boolean | void,
) {
  const ctx = canvas.getContext("2d");
  let width = 0,
    height = 0,
    result: any,
    paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
    visible = true,
    raf = 0,
    disposed = false,
    active = true;
  function render(t = 0) {
    if (ctx && width && height)
      active = draw(ctx, width, height, t, result) !== false;
  }
  function schedule() {
    if (!raf && !disposed && !paused && visible && !document.hidden && active)
      raf = requestAnimationFrame(frame);
  }
  function frame(t: number) {
    raf = 0;
    if (disposed || paused || !visible || document.hidden || !active) return;
    render(t);
    schedule();
  }
  const resize = new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    active = true;
    render();
    schedule();
  });
  resize.observe(canvas);
  const intersection = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    schedule();
  });
  intersection.observe(canvas);
  const visibility = () => schedule();
  document.addEventListener("visibilitychange", visibility);
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", visibility);
  };
  window.addEventListener("pagehide", dispose, { once: true });
  return {
    set: (data: any) => {
      result = data;
      active = true;
      render();
      schedule();
    },
    pause: (value: boolean) => {
      paused = value;
      active = true;
      render();
      schedule();
    },
    redraw: () => {
      active = true;
      render();
      schedule();
    },
    dispose,
  };
}
