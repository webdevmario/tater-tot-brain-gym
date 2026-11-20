-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarPath" TEXT,
    "avatarEmoji" TEXT,
    "grade" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 12,
    "roundSize" INTEGER NOT NULL DEFAULT 10,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Kid" ("avatarEmoji", "avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "username", "weeklyGoal") SELECT "avatarEmoji", "avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "username", "weeklyGoal" FROM "Kid";
DROP TABLE "Kid";
ALTER TABLE "new_Kid" RENAME TO "Kid";
CREATE UNIQUE INDEX "Kid_username_key" ON "Kid"("username");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kidId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "targetMinutes" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 10,
    "packId" TEXT,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Session_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("endedAt", "id", "kidId", "startedAt", "targetMinutes", "xpEarned") SELECT "endedAt", "id", "kidId", "startedAt", "targetMinutes", "xpEarned" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

