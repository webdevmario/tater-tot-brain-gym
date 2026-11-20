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
    "weeklyGoal" INTEGER NOT NULL DEFAULT 3,
    "timerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Kid" ("avatarEmoji", "avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "username", "weeklyGoal") SELECT "avatarEmoji", "avatarPath", "createdAt", "firstName", "grade", "id", "lastName", "sessionMinutes", "updatedAt", "username", "weeklyGoal" FROM "Kid";
DROP TABLE "Kid";
ALTER TABLE "new_Kid" RENAME TO "Kid";
CREATE UNIQUE INDEX "Kid_username_key" ON "Kid"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
