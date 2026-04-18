import express from "express";
import cors from "cors";
import path from "node:path";
import { prisma } from "./db.js";
import kidsRouter from "./routes/kids.js";
import packsRouter from "./routes/packs.js";
import sessionsRouter from "./routes/sessions.js";
import adminRouter from "./routes/admin.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(UPLOADS_DIR)));

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/kids", kidsRouter);
app.use("/api/packs", packsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`Tater Tot Brain Gym API listening on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
