-- The test profile's default avatar is a plain smiley instead of a test tube.
UPDATE "Kid" SET "avatarEmoji" = '🙂' WHERE "isTest" = 1 AND "avatarEmoji" = '🧪';
