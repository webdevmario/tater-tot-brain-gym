-- A test profile can be wiped back to a fresh start from the parent area.
ALTER TABLE "Kid" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
