import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { prisma } from "./db.js";
import kidsRouter from "./routes/kids.js";
import packsRouter from "./routes/packs.js";
import sessionsRouter from "./routes/sessions.js";
import adminRouter from "./routes/admin.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const STATIC_DIR =
  process.env.STATIC_DIR ?? path.resolve(process.cwd(), "../web/dist");
const PUBLIC_SOUNDS_DIR =
  process.env.SOUNDS_DIR ?? path.resolve(process.cwd(), "../web/public/sounds");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));
// Serve sound files directly from apps/web/public/sounds so dropping
// a new MP3 is live without a vite rebuild. Mounted before the SPA
// catch-all so /sounds/* resolves to real files (or 404) instead of
// returning index.html.
if (existsSync(PUBLIC_SOUNDS_DIR)) {
  app.use("/sounds", express.static(PUBLIC_SOUNDS_DIR));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/kids", kidsRouter);
app.use("/api/packs", packsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/admin", adminRouter);

const serveStatic = existsSync(STATIC_DIR);
if (serveStatic) {
  app.use(express.static(STATIC_DIR));
  app.get("*", (req, res) => {
    // SPA fallback only for path-style routes. A path with an extension
    // (e.g. /sounds/correct.mp3) that didn't match a real file should
    // 404, not return index.html — otherwise the browser tries to
    // decode HTML as audio and logs a noisy error.
    if (req.path.includes(".")) return res.sendStatus(404);
    res.sendFile(path.resolve(STATIC_DIR, "index.html"));
  });
}

app.listen(PORT, HOST, () => {
  const bound = HOST === "0.0.0.0" ? "all interfaces" : HOST;
  console.log(`\n🧠 Tater Tot Brain Gym API listening on :${PORT} (${bound})`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Tailnet:  http://<your-mac-tailscale-name>:${PORT}`);
  if (serveStatic) {
    console.log(`   Web:      serving built frontend from ${STATIC_DIR}`);
  } else {
    console.log(`   Web:      no build present — Vite dev server expected on :5173`);
  }
  console.log();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
