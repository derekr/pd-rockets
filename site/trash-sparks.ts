// Page-only celebration after the fixture confirms a deletion; no Rocket state lives here.
export {};
const stage = document.querySelector<HTMLElement>(".trash-stage");
const canvas = stage?.querySelector<HTMLCanvasElement>("canvas.trash-sparks");
const context = canvas?.getContext("2d");

if (stage && canvas && context) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  const colors = ["#c75c47", "#e89870", "#f1ca86", "#a44c51", "#fff9eb"];

  document.addEventListener("site:trash-confirmed", () => {
    if (frame) cancelAnimationFrame(frame);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    if (reduceMotion.matches) {
      context.clearRect(0, 0, width, height);
      return;
    }

    const bin = stage.querySelector<HTMLElement>('[data-drop-list="bin"]');
    if (!bin) return;
    const area = stage.getBoundingClientRect();
    const target = bin.getBoundingClientRect();
    const origin = { x: target.left + target.width / 2 - area.left, y: target.top + target.height / 2 - area.top };
    const particles = Array.from({ length: 32 }, (_, index) => {
      const angle = (index / 32) * Math.PI * 2 + Math.random() * 0.22;
      const speed = 65 + Math.random() * 125;
      return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        size: 2 + Math.random() * 5,
        spin: (Math.random() - 0.5) * 8,
        color: colors[index % colors.length]!,
      };
    });
    const started = performance.now();
    const paint = (now: number) => {
      const elapsed = Math.min((now - started) / 1000, 0.8);
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, 1 - elapsed / 0.8);
      for (const particle of particles) {
        context.save();
        context.translate(origin.x + particle.vx * elapsed, origin.y + particle.vy * elapsed + 150 * elapsed ** 2);
        context.rotate(particle.spin * elapsed);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        context.restore();
      }
      context.globalAlpha = 1;
      frame = elapsed < 0.8 && !document.hidden ? requestAnimationFrame(paint) : 0;
      if (!frame) context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(paint);
  });
}
