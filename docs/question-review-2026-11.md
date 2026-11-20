# Question review: 270 items, 7 packs

Read-only review of `question-review-items.json`. Concrete edits are in `question-review-fixes.json` (164 edits: 8 must-fix, 66 should-fix, 90 nice). All edits were checked by applying them to a copy: every MC item still has 4 unique choices and the answer appears exactly in them.

**Items with a problem (counted once, at their worst severity): 111 of 270** — 6 must-fix, 56 should-fix, 49 nice.

## Counts by pack

| Pack | Items | Must-fix | Should-fix | Nice | of which reorder-only | Answer slot A/B/C/D now | After fixes |
|---|---|---|---|---|---|---|---|
| US States and Capitals | 50 | 0 | 14 | 21 | 13 | 14/26/10/0 | 13/13/12/12 |
| Parts of Speech | 24 | 1 | 1 | 6 | 0 | 4/9/6/5 | 3/9/7/5 |
| Synonyms, Antonyms, and Homophones | 38 | 1 | 23 | 13 | 18 | 3/31/4/0 | 10/9/9/10 |
| Multiplication Facts | 40 | 0 | 0 | 0 | 0 | n/a (typed) | n/a |
| Subtraction Facts | 44 | 0 | 2 | 0 | 0 | n/a (typed) | n/a |
| Basic Science Facts | 31 | 4 | 13 | 9 | 10 | 0/16/14/1 | 8/8/8/7 |
| Sight Words | 43 | 0 | 3 | 0 | 0 | 10/10/12/11 | 10/10/12/11 |

## Worst problems

1. **Two right answers: `saah-hom-g4-002`** (homophone of *weather*). The choice *wether* (a male sheep) is a real word that sounds exactly like *weather*, so it's correct too. The teach card also says weather is "the climate", which is wrong.
2. **Breathing questions contradict the nitrogen question: `sci-g5-006`, `sci-g5-007`.** `sci-g4-002` teaches that air is 78% nitrogen. So we breathe *in* more nitrogen than oxygen, and breathed-*out* air is still mostly nitrogen with about 16% oxygen. A kid who learned the earlier item can defend Nitrogen (in) or Oxygen/Nitrogen (out). Reworded to the gas the body *uses* and the waste gas it *makes*.
3. **Answer-position give-away (pack-wide).** `MultipleChoice.tsx` shows choices in stored order with A-D labels and never shuffles them. In Synonyms/Antonyms/Homophones the answer is **B in 31 of 38** items. In Science it's never A and is D once in 31. In State Capitals it's never D. A kid will learn "pick B". The fixes file reorders 41 items so every slot gets about 25%. **A better fix is a one-line shuffle at render time** (or when the session builds the item), which covers future content too. If you do that, skip every `choices` edit whose reason starts with "Reorder only".
4. **"Smallest unit" items with a smaller listed answer: `sci-g6-002`, `sci-g5-003`.** *Proton* is a listed choice and is smaller than an atom; the item's own context says so. For "basic unit of all living things", *The atom* is defensible. Reworded to "smallest piece of an element that is still that element" and "smallest *living* unit".
5. **`pos-g3-004` "Which word is a NOUN?" includes *run*,** which a 3rd grader knows as a noun (a home run). Swapped for *ran*.
6. Also notable: three homophone items list the prompt word itself as a choice (`saah-hom-g2-001` see, `-g5-001` principal, `-g6-001` affect). `saah-hom-g2-002` prints the answer *to* in the sentence. Several science answers are the only long or technical choice (`sci-g2-005`, `sci-g4-006`, `sci-g5-002`, `sci-g6-001`). `sub-g3-001`'s teach card states something false ("only the tens place changes" for 600 - 10).

## Pack notes

- **Math (84 items):** every answer recomputed and correct; no duplicate facts (including commutative pairs). Only two teach-card fixes (`sub-g2-017`, `sub-g3-001`). Optional polish: show `×` instead of the letter `x` in prompts.
- **Sight Words (43):** no wrong or ambiguous answers; answer slots are already balanced; sentence-start blanks capitalize every choice, so there's no capital-letter give-away. Most items (especially grades 4–5) can be solved by part of speech alone because only one choice is a noun, adverb, and so on. Adding same-part-of-speech distractors usually makes a second choice fit (e.g. *It is important/necessary to tell the truth*), so I only changed the three where it's safe (`sb-g4-005/006/010`). The teach card just repeats the full sentence; that's fine for a word-recognition drill.
- **Parts of Speech (24):** answers follow sentence order in the choice list, so positions vary naturally. `pos-g3-001/002/003` use the same sentence and choices (noun/verb/adjective); fine as a set, but a kid may see the same card three times in one round. `pos-g6-003` (gerund = noun) is a fair grade-6 item and its context already explains it.
- **State Capitals (50):** all 50 states present once, every capital correct. *Oklahoma City* and *Indianapolis* contain the state name (unavoidable; *Kansas City* is a good counter-trap in the Kansas item). Teach cards added only where the trap is a bigger or more famous city and a fact helps it stick; "biggest city" claims were checked (Alabama, South Carolina, Missouri, and West Virginia are worded to avoid shaky "largest" claims).
- **Synonyms/Antonyms/Homophones (38):** besides the items below, `saah-syn-g2-004` (start→begin) and `saah-syn-g3-001` (begin→start) were reverse duplicates; replaced the second with quiet→silent.
- **Science (31):** `sci-g2-004` ("which is a LIQUID: Ice/Water/Steam/Rock") is fine for grade 2, though ice and steam are also water; the new teach card says so.

## Every item with a problem

Severity: **must-fix** = wrong or ambiguous answer; **should-fix** = confusing wording or give-away; **nice** = missing explanation or polish. Exact replacement text is in the fixes JSON (match on `id`).

### US States and Capitals

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `usc-g6-013` | should-fix | Give-away: 'Maui' is an island and 'Pearl Harbor' is a harbor/naval base, not cities, so they can be ruled out without knowing the capital. | Use real Hawaii cities: Hilo, Kailua, Pearl City. |
| `usc-g4-001` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-002` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-004` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-005` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-006` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-009` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-010` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-014` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-015` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g4-016` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-001` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-002` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-003` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-004` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-005` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-006` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-007` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-008` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-009` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-010` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-012` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-017` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g5-018` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-001` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-002` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-005` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-006` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-007` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-008` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |
| `usc-g6-009` | nice | No teach card. The trap here is picking the big/famous city; a one-line why helps it stick. | Add short context. |

**Reorder only (should-fix, answer-position give-away), 13 items:** `usc-g4-007`, `usc-g4-009`, `usc-g4-012`, `usc-g4-014`, `usc-g5-001`, `usc-g5-005`, `usc-g5-006`, `usc-g5-009`, `usc-g5-012`, `usc-g6-003`, `usc-g6-005`, `usc-g6-009`, `usc-g6-012`

### Parts of Speech

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `pos-g3-004` | must-fix | 'run' is also a common noun ('a home run', 'go for a run'), so a careful kid can defend it as the NOUN. | Use 'ran' (only a verb) instead of 'run'; update context. |
| `pos-g6-002` | should-fix | Relative 'that' is a contested case: many grammar books call it a conjunction (subordinator), and kids also learn 'that' as an adjective/determiner ('that cat'). Context is too terse to teach it. | Use 'who', which every grammar treats as a relative pronoun; explain it. |
| `pos-g3-001` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `pos-g3-002` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `pos-g3-003` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `pos-g4-001` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `pos-g5-001` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `pos-g5-003` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |

### Synonyms, Antonyms, and Homophones

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `saah-hom-g4-002` | must-fix | Two correct answers: 'wether' (a male sheep) is a real word pronounced exactly like 'weather'. Context also calls weather 'the climate', which is wrong (climate is the long-term pattern). | Swap 'wether' for 'wetter' (sounds different) and 'writer' for 'feather'; fix context. |
| `saah-ant-g6-001` | should-fix | 'hidden' is a defensible opposite of 'transparent' in its other meaning (open and honest vs secret, e.g. a transparent plan vs a hidden plan). | Replace 'hidden' with 'shiny'. |
| `saah-hom-g2-001` | should-fix | The prompt word 'see' is one of the choices. A word isn't its own homophone, and a 7-8 year old may tap it because it matches. | Replace 'see' with 'seed'. |
| `saah-hom-g2-002` | should-fix | Give-away: the answer 'to' is printed right in the sentence ('...go to the park'). Context also calls this 'to' a preposition; in 'want to go' it isn't. | Change the sentence so 'to' doesn't appear; fix context. |
| `saah-hom-g5-001` | should-fix | The prompt word 'principal' is one of the choices. | Replace 'principal' with 'practical'. |
| `saah-hom-g6-001` | should-fix | The prompt word 'affect' is one of the choices. Also, affect/effect only sound alike in quick everyday speech (careful speech says uh-FECT vs ih-FECT), which the context should admit. | Replace 'affect' with 'infect'; add a line to the context. |
| `saah-syn-g3-001` | should-fix | Reverse duplicate of saah-syn-g2-004 (start -> begin vs begin -> start). Seeing one gives away the other. | Replace with a new pair: quiet -> silent. |
| `saah-ant-g2-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g2-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g2-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g2-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g3-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g3-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g4-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g4-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g5-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g5-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g6-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-ant-g6-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-hom-g3-002` | nice | Context is generic or thin; it doesn't explain this specific item or why the other choices are wrong. | Item-specific explanation. |
| `saah-hom-g4-001` | nice | No memory tip; piece/peace is a classic mix-up. | Add mnemonic 'A piece of pie.' |
| `saah-hom-g5-002` | nice | No memory tip for the e/i spelling. | Add mnemonic. |
| `saah-syn-g2-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g2-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g2-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g2-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g2-005` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g3-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g3-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g4-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g4-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g4-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g5-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g5-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g5-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g6-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `saah-syn-g6-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |

**Reorder only (should-fix, answer-position give-away), 18 items:** `saah-ant-g2-001`, `saah-ant-g2-004`, `saah-ant-g3-001`, `saah-ant-g3-002`, `saah-ant-g4-001`, `saah-ant-g4-002`, `saah-hom-g2-002`, `saah-hom-g3-002`, `saah-hom-g3-003`, `saah-syn-g2-001`, `saah-syn-g2-003`, `saah-syn-g3-002`, `saah-syn-g4-001`, `saah-syn-g4-002`, `saah-syn-g5-001`, `saah-syn-g5-002`, `saah-syn-g6-001`, `saah-syn-g6-002`

### Subtraction Facts

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `sub-g2-017` | should-fix | Context says subtracting 10 from ANY number lowers the tens digit by 1, which isn't true when the tens digit is 0 (105 - 10 = 95). The grade-3 item sub-g3-001 (600 - 10) is exactly that case. | Make the context about this problem. |
| `sub-g3-001` | should-fix | Context says 'only the tens place changes', which is false (600 -> 590 changes the hundreds digit too), and '59 tens + 10 ones worth' is confusing. | Rewrite the context using the tens idea cleanly. |

### Basic Science Facts

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `sci-g5-003` | must-fix | 'The atom' is defensible: every living thing is made of atoms, which are more basic than cells. The intended idea is the smallest LIVING unit. | Reword to 'smallest living unit'; add context. |
| `sci-g5-006` | must-fix | Ambiguous: air is about 78% nitrogen, so we breathe in more nitrogen than oxygen. sci-g4-002 teaches exactly that, so a careful kid can defend 'Nitrogen'. | Ask which gas the body USES when breathing in; add context. |
| `sci-g5-007` | must-fix | Ambiguous: breathed-out air is still mostly nitrogen and about 16% oxygen; carbon dioxide is only about 4%. 'Oxygen' and 'Nitrogen' are both literally breathed out. | Ask for the waste gas the body makes and breathes out; add context. |
| `sci-g6-002` | must-fix | 'Proton' is a choice and is a smaller unit of matter than an atom; the item's own context admits atoms are made of smaller particles. | Reword to 'smallest piece of an element that is still that element'. |
| `sci-g2-005` | should-fix | Give-away: the answer is the only choice that lists several things; the other three all say 'Only...' or 'only'. | Make every choice a list of three things. |
| `sci-g4-006` | should-fix | Give-away: the answer is about 3x longer than the others and the only one with science words (evaporation, condensation, precipitation). | Rewrite answer and distractors to similar length and plain words; add context with the vocabulary. |
| `sci-g5-002` | should-fix | Awkward wording ('What part of a plant cell do plant cells have...') asks for one part but the answer is two; the answer is also the only two-part choice, which gives it away. | Reword; make all choices two-part. |
| `sci-g6-001` | should-fix | Give-away: the answer is the only choice with science words; the others ('Land, water, sky', 'Surface, middle, bottom') are obviously silly for a 6th grader. | Use plausible-sounding distractors; say 'from the outside in'. |
| `sci-g2-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g2-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g2-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g2-006` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g3-002` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g3-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g3-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g3-005` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g3-006` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g4-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g4-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g4-005` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g5-001` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g5-004` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g6-003` | nice | No teach card explaining the answer or the trap choices. | Add short context. |
| `sci-g6-005` | nice | No teach card explaining the answer or the trap choices. | Add short context. |

**Reorder only (should-fix, answer-position give-away), 10 items:** `sci-g2-001`, `sci-g2-003`, `sci-g2-004`, `sci-g3-005`, `sci-g4-003`, `sci-g4-005`, `sci-g5-001`, `sci-g5-005`, `sci-g5-006`, `sci-g6-005`

### Sight Words

| id | Severity | Problem | Suggested fix |
|---|---|---|---|
| `sb-g4-005` | should-fix | Give-away: the answer is the only choice of the right part of speech, so it can be picked without reading the other words for meaning. | Add same-part-of-speech distractors that clearly don't fit the sentence. |
| `sb-g4-006` | should-fix | Give-away: the answer is the only choice of the right part of speech, so it can be picked without reading the other words for meaning. | Add same-part-of-speech distractors that clearly don't fit the sentence. |
| `sb-g4-010` | should-fix | Give-away: the answer is the only choice of the right part of speech, so it can be picked without reading the other words for meaning. | Add same-part-of-speech distractors that clearly don't fit the sentence. |
