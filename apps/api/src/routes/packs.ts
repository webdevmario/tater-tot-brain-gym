import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();

const ItemSchema = z.object({
  id: z.string().min(1),
  gradeLevel: z.number().int().min(0).max(12),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  choices: z.array(z.string()).optional(),
  context: z.string().optional(),
  mnemonic: z.string().optional(),
  audioText: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const PackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().min(1),
  questionType: z.string().min(1),
  curriculum: z.string().nullable().optional(),
  source: z.string().optional(),
  gradeMin: z.number().int().min(0).max(12),
  gradeMax: z.number().int().min(0).max(12),
  items: z.array(ItemSchema),
});

router.get("/", async (_req, res) => {
  const packs = await prisma.pack.findMany({
    where: { archived: false },
    include: { _count: { select: { items: true } } },
    orderBy: { title: "asc" },
  });
  res.json(packs);
});

router.get("/:id", async (req, res) => {
  const pack = await prisma.pack.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: [{ gradeLevel: "asc" }, { id: "asc" }] } },
  });
  if (!pack) return res.status(404).json({ error: "Not found" });

  // Hydrate JSON fields
  const items = pack.items.map((i) => ({
    ...i,
    choices: i.choices ? JSON.parse(i.choices) : null,
    tags: i.tags ? JSON.parse(i.tags) : null,
  }));
  res.json({ ...pack, items });
});

router.post("/", async (req, res) => {
  const parsed = PackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { items, ...pack } = parsed.data;
  const created = await prisma.pack.create({
    data: {
      ...pack,
      curriculum: pack.curriculum ?? null,
      items: {
        create: items.map((item) => ({
          id: item.id,
          gradeLevel: item.gradeLevel,
          prompt: item.prompt,
          answer: item.answer,
          choices: item.choices ? JSON.stringify(item.choices) : null,
          context: item.context,
          mnemonic: item.mnemonic,
          audioText: item.audioText,
          tags: item.tags ? JSON.stringify(item.tags) : null,
        })),
      },
    },
  });
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const parsed = PackSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { items, ...packData } = parsed.data;
  const pack = await prisma.pack.update({
    where: { id: req.params.id },
    data: {
      ...packData,
      version: { increment: 1 },
    },
  });
  res.json(pack);
});

router.post("/:id/items", async (req, res) => {
  const parsed = ItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const item = await prisma.item.create({
    data: {
      id: parsed.data.id,
      packId: req.params.id,
      gradeLevel: parsed.data.gradeLevel,
      prompt: parsed.data.prompt,
      answer: parsed.data.answer,
      choices: parsed.data.choices ? JSON.stringify(parsed.data.choices) : null,
      context: parsed.data.context,
      mnemonic: parsed.data.mnemonic,
      audioText: parsed.data.audioText,
      tags: parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
    },
  });
  res.status(201).json(item);
});

router.put("/:packId/items/:itemId", async (req, res) => {
  const parsed = ItemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.choices) data.choices = JSON.stringify(parsed.data.choices);
  if (parsed.data.tags) data.tags = JSON.stringify(parsed.data.tags);

  const item = await prisma.item.update({
    where: { id: req.params.itemId },
    data,
  });
  res.json(item);
});

router.delete("/:packId/items/:itemId", async (req, res) => {
  await prisma.item.delete({ where: { id: req.params.itemId } });
  res.status(204).end();
});

router.post("/:id/archive", async (req, res) => {
  const pack = await prisma.pack.update({
    where: { id: req.params.id },
    data: { archived: true },
  });
  res.json(pack);
});

// Export pack as JSON (for backup or sharing)
router.get("/:id/export", async (req, res) => {
  const pack = await prisma.pack.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: [{ gradeLevel: "asc" }, { id: "asc" }] } },
  });
  if (!pack) return res.status(404).json({ error: "Not found" });

  const exported = {
    id: pack.id,
    title: pack.title,
    description: pack.description,
    subject: pack.subject,
    questionType: pack.questionType,
    curriculum: pack.curriculum,
    source: pack.source,
    gradeMin: pack.gradeMin,
    gradeMax: pack.gradeMax,
    items: pack.items.map((i) => ({
      id: i.id,
      gradeLevel: i.gradeLevel,
      prompt: i.prompt,
      answer: i.answer,
      ...(i.choices && { choices: JSON.parse(i.choices) }),
      ...(i.context && { context: i.context }),
      ...(i.mnemonic && { mnemonic: i.mnemonic }),
      ...(i.audioText && { audioText: i.audioText }),
      ...(i.tags && { tags: JSON.parse(i.tags) }),
    })),
  };

  res.setHeader("Content-Disposition", `attachment; filename="${pack.id}.json"`);
  res.json(exported);
});

export default router;
