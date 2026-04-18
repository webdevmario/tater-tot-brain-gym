/**
 * Seed script. Run once on first setup with `pnpm seed`.
 *
 * Reads pack JSON files from packages/content/packs/ and inserts them
 * into the database. Packs are keyed by their `id` field. If a pack with
 * the same id already exists, seeding is skipped for that pack (idempotent).
 *
 * After the initial seed, the DB is the source of truth. Edit packs through
 * the admin UI. The files in packages/content/packs/ are not consulted again
 * unless you explicitly re-run `pnpm seed` (which only adds new packs, does
 * not overwrite existing ones).
 */

import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.resolve(__dirname, "../../../packages/content/packs");

type SeedItem = {
  id: string;
  gradeLevel: number;
  prompt: string;
  answer: string;
  choices?: string[];
  context?: string;
  mnemonic?: string;
  audioText?: string;
  tags?: string[];
};

type SeedPack = {
  id: string;
  title: string;
  description?: string;
  subject: string;
  questionType: string;
  curriculum?: string | null;
  source?: string;
  gradeMin: number;
  gradeMax: number;
  items: SeedItem[];
};

async function walkPackFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkPackFiles(full)));
    } else if (entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

async function seedPack(pack: SeedPack) {
  const existing = await prisma.pack.findUnique({ where: { id: pack.id } });
  if (existing) {
    console.log(`  skip (exists): ${pack.id}`);
    return;
  }

  await prisma.pack.create({
    data: {
      id: pack.id,
      title: pack.title,
      description: pack.description,
      subject: pack.subject,
      questionType: pack.questionType,
      curriculum: pack.curriculum ?? null,
      source: pack.source,
      gradeMin: pack.gradeMin,
      gradeMax: pack.gradeMax,
      items: {
        create: pack.items.map((item) => ({
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

  console.log(`  seeded: ${pack.id} (${pack.items.length} items)`);
}

async function main() {
  console.log(`Seeding packs from ${PACKS_DIR}`);
  const files = await walkPackFiles(PACKS_DIR);
  console.log(`Found ${files.length} pack file(s)`);

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const pack = JSON.parse(raw) as SeedPack;
    await seedPack(pack);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
