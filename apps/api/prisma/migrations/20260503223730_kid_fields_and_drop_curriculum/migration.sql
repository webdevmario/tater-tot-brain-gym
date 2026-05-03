/*
  Warnings:

  - You are about to drop the column `curriculum` on the `Kid` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Kid` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Kid` table. All the data in the column will be lost.
  - You are about to drop the column `curriculum` on the `Pack` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Kid` table without a default value. This is not possible if the table is not empty.
  - Added the required column `handle` to the `Kid` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Kid` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatarPath" TEXT,
    "grade" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 12,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Kid" ("avatarPath", "createdAt", "grade", "id", "sessionMinutes", "updatedAt", "weeklyGoal") SELECT "avatarPath", "createdAt", "grade", "id", "sessionMinutes", "updatedAt", "weeklyGoal" FROM "Kid";
DROP TABLE "Kid";
ALTER TABLE "new_Kid" RENAME TO "Kid";
CREATE UNIQUE INDEX "Kid_handle_key" ON "Kid"("handle");
CREATE TABLE "new_Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "source" TEXT,
    "gradeMin" INTEGER NOT NULL,
    "gradeMax" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Pack" ("archived", "createdAt", "description", "gradeMax", "gradeMin", "id", "questionType", "source", "subject", "title", "updatedAt", "version") SELECT "archived", "createdAt", "description", "gradeMax", "gradeMin", "id", "questionType", "source", "subject", "title", "updatedAt", "version" FROM "Pack";
DROP TABLE "Pack";
ALTER TABLE "new_Pack" RENAME TO "Pack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
