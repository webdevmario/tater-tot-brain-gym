import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
fs.mkdirSync(AVATARS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: AVATARS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const CreateKidSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  username: z.string().min(1).max(40),
  grade: z.number().int().min(0).max(12),
  sessionMinutes: z.number().int().min(5).max(60).optional(),
  weeklyGoal: z.number().int().min(1).max(14).optional(),
});

router.get("/", async (_req, res) => {
  const kids = await prisma.kid.findMany({
    orderBy: { createdAt: "asc" },
  });
  res.json(kids);
});

router.get("/:id", async (req, res) => {
  const kid = await prisma.kid.findUnique({
    where: { id: req.params.id },
    include: {
      enabledPacks: { include: { pack: true } },
      badges: { orderBy: { earnedAt: "desc" } },
    },
  });
  if (!kid) return res.status(404).json({ error: "Not found" });
  res.json(kid);
});

router.post("/", async (req, res) => {
  const parsed = CreateKidSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const kid = await prisma.kid.create({ data: parsed.data });
  res.status(201).json(kid);
});

router.put("/:id", async (req, res) => {
  const parsed = CreateKidSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const kid = await prisma.kid.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(kid);
});

router.delete("/:id", async (req, res) => {
  await prisma.kid.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

router.post("/:id/avatar", upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const relPath = `/uploads/avatars/${req.file.filename}`;
  const kid = await prisma.kid.update({
    where: { id: req.params.id },
    data: { avatarPath: relPath },
  });
  res.json(kid);
});

router.delete("/:id/avatar", async (req, res) => {
  // Best-effort: drop the row's avatar pointer; leave the file on
  // disk. Cleaning up orphaned avatar files is a separate batch
  // concern (worth doing, but not on every deletion).
  try {
    const kid = await prisma.kid.update({
      where: { id: req.params.id },
      data: { avatarPath: null },
    });
    res.json(kid);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Kid not found" });
    }
    throw err;
  }
});

router.post("/:id/packs/:packId", async (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  const kp = await prisma.kidPack.upsert({
    where: {
      kidId_packId: { kidId: req.params.id, packId: req.params.packId },
    },
    update: { enabled },
    create: {
      kidId: req.params.id,
      packId: req.params.packId,
      enabled,
    },
  });
  res.json(kp);
});

export default router;
