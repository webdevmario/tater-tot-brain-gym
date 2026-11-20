import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { BADGES, RANKS, getKidProgress } from "../services/progression.js";
import { THEMES, themeById } from "../services/themes.js";

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
  avatarEmoji: z.string().max(8).nullable().optional(),
  grade: z.number().int().min(0).max(12),
  sessionMinutes: z.number().int().min(5).max(60).optional(),
  roundSize: z.number().int().min(5).max(30).optional(),
  weeklyGoal: z.number().int().min(1).max(14).optional(),
});

router.get("/", async (req, res) => {
  const kids = await prisma.kid.findMany({
    orderBy: { createdAt: "asc" },
  });
  // ?summary=1 adds rank + streak for the profile picker.
  if (req.query.summary) {
    const withSummary = await Promise.all(
      kids.map(async (k) => {
        const p = await getKidProgress(k.id);
        return {
          ...k,
          summary: p
            ? {
                rank: p.rank,
                totalXp: p.totalXp,
                streak: p.streak,
                practicedToday: p.practicedToday,
                theme: themeById(k.theme),
                title: titleLabel(k.titleBadge, p.badges),
              }
            : null,
        };
      })
    );
    return res.json(withSummary);
  }
  res.json(kids);
});

// Everything the kid dashboard shows: rank, XP, streak, weekly goal,
// badges, and per-pack learning progress.
router.get("/:id/progress", async (req, res) => {
  const kid = await prisma.kid.findUnique({
    where: { id: req.params.id },
    include: {
      enabledPacks: {
        where: { enabled: true, pack: { archived: false } },
        include: { pack: { include: { _count: { select: { items: true } } } } },
      },
    },
  });
  if (!kid) return res.status(404).json({ error: "Not found" });
  const progress = await getKidProgress(kid.id);
  if (!progress) return res.status(404).json({ error: "Not found" });
  const { reviewStates, ...rest } = progress;

  // Only count items at or below the kid's grade (what the engine can
  // actually serve), and hide packs with nothing to practice yet.
  const eligible = await prisma.item.groupBy({
    by: ["packId"],
    where: {
      packId: { in: kid.enabledPacks.map((kp) => kp.packId) },
      gradeLevel: { lte: kid.grade },
    },
    _count: { _all: true },
  });
  const eligibleByPack = new Map(eligible.map((e) => [e.packId, e._count._all]));

  const packs = kid.enabledPacks
    .map(({ pack }) => {
      const states = reviewStates.filter((r) => r.item.packId === pack.id);
      return {
        id: pack.id,
        title: pack.title,
        subject: pack.subject,
        questionType: pack.questionType,
        total: eligibleByPack.get(pack.id) ?? 0,
        learned: states.filter((r) => r.repetitions > 0 || r.masteredAt).length,
        mastered: states.filter((r) => r.masteredAt).length,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  const { enabledPacks: _omit, ...kidFields } = kid;
  res.json({
    kid: kidFields,
    ...rest,
    packs,
    ranks: RANKS,
    theme: themeById(kid.theme),
    title: titleLabel(kid.titleBadge, progress.badges),
    themes: THEMES.map((t) => ({ ...t, unlocked: progress.rank.level >= t.minLevel })),
  });
});

/** The kid's chosen title, only if that badge is actually earned. */
function titleLabel(code: string | null, badges: Array<{ code: string; label: string; earnedAt: Date | null }>) {
  if (!code) return null;
  const b = badges.find((x) => x.code === code && x.earnedAt);
  return b ? b.label : null;
}

// Kid-facing customization: color theme, emoji avatar, title. Locked
// themes and unearned titles are rejected so the rules can't be skipped.
const StyleSchema = z.object({
  theme: z.string().max(20).optional(),
  avatarEmoji: z.string().min(1).max(16).optional(),
  titleBadge: z.string().max(40).nullable().optional(),
});

router.patch("/:id/style", async (req, res) => {
  const parsed = StyleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const progress = await getKidProgress(req.params.id);
  if (!progress) return res.status(404).json({ error: "Not found" });

  const data: Record<string, unknown> = {};
  const { theme, avatarEmoji, titleBadge } = parsed.data;
  if (theme !== undefined) {
    const t = THEMES.find((x) => x.id === theme);
    if (!t) return res.status(400).json({ error: "Unknown theme" });
    if (progress.rank.level < t.minLevel) return res.status(403).json({ error: "Theme is locked" });
    data.theme = theme;
  }
  if (avatarEmoji !== undefined) {
    data.avatarEmoji = avatarEmoji;
    data.avatarPath = null; // emoji replaces a photo, same as in admin
  }
  if (titleBadge !== undefined) {
    if (titleBadge !== null) {
      const known = BADGES.some((b) => b.code === titleBadge);
      const earned = progress.badges.some((b) => b.code === titleBadge && b.earnedAt);
      if (!known || !earned) return res.status(403).json({ error: "Title not earned yet" });
    }
    data.titleBadge = titleBadge;
  }

  const kid = await prisma.kid.update({ where: { id: req.params.id }, data });
  res.json(kid);
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

  // When admin sets an emoji, also clear the photo path so the emoji
  // actually renders (photo wins on render). Setting avatarEmoji to
  // null is the inverse: explicitly removing emoji, photo (if any)
  // is left alone.
  const data: Record<string, unknown> = { ...parsed.data };
  if (
    data.avatarEmoji !== undefined &&
    data.avatarEmoji !== null &&
    data.avatarEmoji !== ""
  ) {
    data.avatarPath = null;
  }

  try {
    const kid = await prisma.kid.update({
      where: { id: req.params.id },
      data,
    });
    res.json(kid);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({ error: "Kid not found" });
    }
    throw err;
  }
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
