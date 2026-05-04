# Sounds

Drop short SFX files here. They're loaded by `apps/web/src/lib/sounds.ts`
via `playSound("correct")` etc. — see that file for the call sites.

## Expected filenames

| File              | Plays when                                     | Suggested length |
|-------------------|-----------------------------------------------|------------------|
| `correct.mp3`     | Kid answers a question correctly              | < 0.5s           |
| `wrong.mp3`       | Kid answers wrong, or the question times out  | < 0.5s           |
| `halftime.mp3`    | Mid-session check-in (50% of the workout)     | 1-2s             |
| `streak.mp3`      | Reactive breather after a wrong-answer streak | 1-2s             |
| `session-end.mp3` | Workout complete                              | 1-3s             |

A missing file is handled silently — the call to `playSound("correct")`
becomes a no-op if `/sounds/correct.mp3` returns 404. No errors, no UI
break. Drop files in as you find them; you don't have to land all five
at once.

## Format

- **MP3** is fine and broadly supported. **OGG** also works, just
  update the path in `lib/sounds.ts`.
- Keep them small. ~5-30 KB each is plenty for a UI ding.
- Mono or stereo, 44.1 kHz, 96-128 kbps — overkill quality is a waste
  here and slows the first interaction.

## Where to find royalty-free sounds

- **[Mixkit](https://mixkit.co/free-sound-effects/)** — clean
  categories ("game sounds", "win", "fail"), no attribution required.
- **[Freesound.org](https://freesound.org)** — huge library, filter by
  CC0 license to avoid attribution rules.
- **[Pixabay Sound Effects](https://pixabay.com/sound-effects/)** —
  royalty-free, no attribution required.
- **[Kenney Game Assets](https://kenney.nl/assets?q=audio)** — packs
  designed for game UI, all CC0.

## Mute

Mute persists per-device via `localStorage` (key: `ttbg-sounds-muted`).
A toggle in admin → settings is a possible follow-up; for now you can
mute manually from devtools:

```js
localStorage.setItem("ttbg-sounds-muted", "true");
```
