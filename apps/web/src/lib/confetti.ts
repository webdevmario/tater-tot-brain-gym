// Tiny dependency-free confetti burst on a throwaway canvas.
// Skipped entirely when the device asks for reduced motion.

const COLORS = ["#F2B04A", "#1F7F7F", "#F06B5D", "#7CC1C1", "#3FA36B", "#E89020"];

export function confetti(pieces = 120): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: "none",
    zIndex: "60",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: pieces }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 6,
    size: 6 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));

  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
      ctx!.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
