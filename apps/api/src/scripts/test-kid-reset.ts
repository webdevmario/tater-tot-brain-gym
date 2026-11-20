/**
 * `pnpm test-kid:reset` — create the test profile if it's missing,
 * otherwise wipe it back to a fresh start. Uses DATABASE_URL from
 * apps/api/.env, so from the main checkout this is the live database.
 */

import { prisma } from "../db.js";
import { ensureTestKid, resetTestKid } from "../services/test-kid.js";

const { kid, created } = await ensureTestKid();
if (!created) await resetTestKid(kid.id);
console.log(
  created
    ? `Created test profile "${kid.firstName}" (@${kid.username}).`
    : `Reset test profile "${kid.firstName}" (@${kid.username}) to a fresh start.`
);
await prisma.$disconnect();
