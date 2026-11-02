# Mash Lab

Entry for RUN's **October Jam: Monster Mash** (Oct 8 to Nov 2, 2026). Built from scratch on Oct 30, 2026.

Stitch monsters from a head, a body and an extra so they carry every trait a villager asks for, before the lantern burns out. An exact match (no extra traits) is a PERFECT MASH (x1.5); streaks multiply up to x5. Three misses and the lab closes.

- Play: https://w.run/wittylynx103/mash-lab (mirror outside RUN: https://mash-lab.designmaster.workers.dev , `wrangler deploy` serves `dist/`)
- Everything is drawn in code on a 2D canvas (no image assets); sound is WebAudio.
- **The Mash** (1.0.7): a delivered monster dances and struts off (`src/anim.mjs`, pure pose curves, unit-tested; the lantern pauses meanwhile), a miss makes it tumble apart and re-stitch, and the first 3 orders of a run light the part boxes that bring a missing trait (`src/hint.mjs`, unit-tested). `?poster` draws the square key art used as the jam thumbnail.
- **Monster Book** (1.0.8): every head x body x extra you deliver gets a name ("Magma Jack, bat-winged") and goes into a book kept in storage, 80 to find; a new one pops up on delivery, the title and the closing screen show the count (`src/codex.mjs`, unit-tested).
- **Music** (1.0.6): an 8-bar E minor march from `src/music.mjs` (pattern data, unit-tested), scheduled 0.2 s ahead by the game loop; it quickens when the lantern is about to go out. The note button (top left) or `M` mutes, remembered in storage.
- **Night Parade Board** (1.0.1): when the lab closes the score is posted to the RUN leaderboard (`RundotGameAPI.leaderboard`) and the screen shows your rank and the top five mashers. Runs shorter than 10 s are not ranked (leaderboard config).
- Source: `src/game.js` (game) plus `src/board.mjs` (board text), `src/music.mjs` (march pattern), `src/anim.mjs` (dance and tumble poses) and `src/hint.mjs` (hint boxes), all unit-tested. `npm run build` bundles them with the RUN SDK into `dist/game.js`; `dist/` is what gets uploaded.
- Deploy: `npm run build && rundot deploy --public --bump Patch --changelog-file CHANGELOG-<v>.md`. Test: `npm test` (unit tests plus `test/smoke.test.mjs`, which runs the real game loop in a fake DOM for 10 s per scenario with the first frame stamped early, the case that froze 1.0.6 in headless Chrome). `?autoplay` plays a scripted run (one right delivery, one wrong) so a headless browser can screenshot it.
- A self-check in `game.js` generates 200 orders on load and logs any that no part combination can satisfy.

Made with AI-assisted coding (Claude Code).
