/*
  Warnings:

  - You are about to drop the column `handle` on the `Kid` table. All the data in the column will be lost.
  - Added the required column `username` to the `Kid` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarPath" TEXT,
    "grade" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 12,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Kid" ("avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "weeklyGoal") SELECT "avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "weeklyGoal" FROM "Kid";
DROP TABLE "Kid";
ALTER TABLE "new_Kid" RENAME TO "Kid";
CREATE UNIQUE INDEX "Kid_username_key" ON "Kid"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
