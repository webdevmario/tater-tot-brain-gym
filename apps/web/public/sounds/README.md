# Sounds

Every sound effect is synthesized in the browser (`src/lib/sounds.ts`),
so nothing here is required. To swap one for a real recording, drop an
MP3 with the matching name in this folder. It's picked up automatically
the next time the app loads; a missing file just means "use the
synthesized one".

| File              | Plays when                          |
|-------------------|-------------------------------------|
| `correct.mp3`     | Right answer                        |
| `wrong.mp3`       | Wrong answer (keep it gentle)       |
| `streak.mp3`      | 3, 5, 8, 10… right in a row         |
| `halftime.mp3`    | Halfway through a round             |
| `session-end.mp3` | Round finished                      |
| `level-up.mp3`    | Round finished with a new rank      |

Keep files short (under 2s) and small (5–40 KB). Good CC0 sources:
[Kenney](https://kenney.nl/assets?q=audio),
[Freesound](https://freesound.org) (filter by CC0).

Preview all of them in the parent area under Settings → Sound effects.
Spoken words are separate: they come from the Mac's voice (`/api/tts`),
chosen under Settings → Reading voice.
