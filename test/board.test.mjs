import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardLines } from '../src/board.mjs';

test('my rank first, then the podium clipped to 5 names of 14 chars', () => {
  const top = [...Array(7)].map((_, i) => ({ rank: i + 1, username: 'A very long masher name ' + i, score: 1000 - i }));
  const lines = boardLines({ rank: 7, totalPlayers: 40 }, top);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], 'You: #7 of 40');
  assert.equal(lines[1], '1. A very long ma  1000');
  assert.equal(lines[5], '5. A very long ma  996');
});

test('no rank and no entries leave the board empty', () => {
  assert.deepEqual(boardLines(null, []), []);
  assert.deepEqual(boardLines({ rank: null, totalPlayers: 0 }, null), []);
});
