import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintBoxes } from '../src/hint.mjs';

const P = (name, ...traits) => ({ name, traits });
const ROWS = [
  [P('Three-Eye', 'EYES'), P('Jack', 'GLOW', 'FIRE'), P('Skull', 'BONES'), P('Imp', 'HORNS', 'FIRE')],
  [P('Ooze', 'SLIME', 'GLOW'), P('Shag', 'FUR'), P('Ribs', 'BONES'), P('Magma', 'FIRE')],
  [P('Bat', 'FLY'), P('Tentacles', 'SLIME'), P('Eyestalks', 'EYES'), P('Moth', 'FLY', 'GLOW'), P('Antlers', 'HORNS', 'FUR')],
];
const lit = (h) => h.flatMap((row, i) => row.flatMap((ks, j) => (ks.length ? [ROWS[i][j].name + ':' + ks.join('+')] : [])));

test('lights every box that brings a trait the order still lacks, with that trait', () => {
  // Skull + Ooze + Tentacles = BONES, SLIME, GLOW; the order wants FIRE and FLY
  assert.deepEqual(lit(hintBoxes(ROWS, [2, 0, 1], ['FIRE', 'FLY'])), ['Jack:FIRE', 'Imp:FIRE', 'Magma:FIRE', 'Bat:FLY', 'Moth:FLY']);
});

test('nothing is lit once the monster already has every trait asked for', () => {
  assert.deepEqual(lit(hintBoxes(ROWS, [1, 3, 0], ['FIRE', 'FLY'])), []);
});
