# Mash Lab

Entry for RUN's **October Jam: Monster Mash** (Oct 8 to Nov 2, 2026). Built from scratch on Oct 30, 2026.

Stitch monsters from a head, a body and an extra so they carry every trait a villager asks for, before the lantern burns out. An exact match (no extra traits) is a PERFECT MASH (x1.5); streaks multiply up to x5. Three misses and the lab closes.

- Play: https://w.run/wittylynx103/mash-lab
- Everything is drawn in code on a 2D canvas (no image assets); sound is WebAudio.
- **Night Parade Board** (1.0.1): when the lab closes the score is posted to the RUN leaderboard (`RundotGameAPI.leaderboard`) and the screen shows your rank and the top five mashers. Runs shorter than 10 s are not ranked (leaderboard config).
- Source: `src/game.js` (game) and `src/board.mjs` (board text, unit-tested). `npm run build` bundles them with the RUN SDK into `dist/game.js`; `dist/` is what gets uploaded.
- Deploy: `npm run build && rundot deploy --public`. Test: `npm test`.
- A self-check in `game.js` generates 200 orders on load and logs any that no part combination can satisfy.

Made with AI-assisted coding (Claude Code).
