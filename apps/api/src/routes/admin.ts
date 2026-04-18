import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPin, verifyPin } from "../services/pin.js";

const router = Router();

// Initial PIN setup: only works if no PIN is set yet.
router.post("/pin/setup", async (req, res) => {
  const { pin } = req.body as { pin: string };
  if (!pin || pin.length < 4) return res.status(400).json({ error: "PIN must be at least 4 digits" });

  const existing = await prisma.appSetting.findUnique({ where: { key: "admin-pin" } });
  if (existing) return res.status(409).json({ error: "PIN already set. Use change endpoint." });

  await prisma.appSetting.create({
    data: { key: "admin-pin", value: hashPin(pin) },
  });
  res.status(201).json({ ok: true });
});

// Check if a PIN is set (used by the UI to know whether to show setup or login)
router.get("/pin/status", async (_req, res) => {
  const existing = await prisma.appSetting.findUnique({ where: { key: "admin-pin" } });
  res.json({ set: !!existing });
});

// Verify a PIN (the frontend stores a success flag in sessionStorage to gate admin UI)
router.post("/pin/verify", async (req, res) => {
  const { pin } = req.body as { pin: string };
  const row = await prisma.appSetting.findUnique({ where: { key: "admin-pin" } });
  if (!row) return res.status(404).json({ error: "No PIN set" });
  if (!verifyPin(pin, row.value)) return res.status(401).json({ error: "Wrong PIN" });
  res.json({ ok: true });
});

router.post("/pin/change", async (req, res) => {
  const { oldPin, newPin } = req.body as { oldPin: string; newPin: string };
  const row = await prisma.appSetting.findUnique({ where: { key: "admin-pin" } });
  if (!row || !verifyPin(oldPin, row.value)) return res.status(401).json({ error: "Wrong current PIN" });
  if (!newPin || newPin.length < 4) return res.status(400).json({ error: "New PIN must be at least 4 digits" });

  await prisma.appSetting.update({
    where: { key: "admin-pin" },
    data: { value: hashPin(newPin) },
  });
  res.json({ ok: true });
});

// Progress dashboard for a kid
router.get("/progress/:kidId", async (req, res) => {
  const kidId = req.params.kidId;
  const kid = await prisma.kid.findUnique({ where: { id: kidId } });
  if (!kid) return res.status(404).json({ error: "Kid not found" });

  const [totalAttempts, correctAttempts, sessions, reviewStates, recentAttempts] =
    await Promise.all([
      prisma.attempt.count({ where: { kidId } }),
      prisma.attempt.count({ where: { kidId, correct: true } }),
      prisma.session.findMany({
        where: { kidId, endedAt: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 20,
      }),
      prisma.reviewState.findMany({
        where: { kidId },
        include: { item: { include: { pack: { select: { id: true, title: true, subject: true } } } } },
      }),
      prisma.attempt.findMany({
        where: { kidId },
        include: { item: { include: { pack: { select: { title: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  const mastered = reviewStates.filter((r) => r.masteredAt).length;
  const struggling = reviewStates.filter((r) => r.lapses >= 2 || r.strugglingFlag).length;
  const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

  // Group by pack
  const packStats = new Map<string, { title: string; correct: number; total: number; mastered: number }>();
  for (const rs of reviewStates) {
    const pack = rs.item.pack;
    const existing = packStats.get(pack.id) ?? { title: pack.title, correct: 0, total: 0, mastered: 0 };
    existing.total += 1;
    if (rs.masteredAt) existing.mastered += 1;
    packStats.set(pack.id, existing);
  }

  res.json({
    kid,
    totals: { attempts: totalAttempts, correct: correctAttempts, accuracy },
    mastery: { mastered, struggling, total: reviewStates.length },
    sessions,
    packStats: Array.from(packStats.entries()).map(([id, s]) => ({ packId: id, ...s })),
    recentAttempts,
    strugglingItems: reviewStates
      .filter((r) => r.lapses >= 2 || r.strugglingFlag)
      .slice(0, 20)
      .map((r) => ({
        itemId: r.itemId,
        prompt: r.item.prompt,
        answer: r.item.answer,
        packTitle: r.item.pack.title,
        lapses: r.lapses,
      })),
  });
});

router.patch("/review-state/:kidId/:itemId", async (req, res) => {
  const schema = z.object({
    masteredAt: z.string().datetime().nullable().optional(),
    strugglingFlag: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const data: Record<string, unknown> = {};
  if ("masteredAt" in parsed.data) {
    data.masteredAt = parsed.data.masteredAt ? new Date(parsed.data.masteredAt) : null;
  }
  if ("strugglingFlag" in parsed.data) {
    data.strugglingFlag = parsed.data.strugglingFlag;
  }

  const rs = await prisma.reviewState.update({
    where: { kidId_itemId: { kidId: req.params.kidId, itemId: req.params.itemId } },
    data,
  });
  res.json(rs);
});

export default router;
