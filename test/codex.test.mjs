import test from 'node:test'; import assert from 'node:assert/strict';
import { monsterName, codexKey, record, TOTAL } from '../src/codex.mjs';

const H = [{ name: 'Jack' }, { name: 'Imp' }], B = [{ name: 'Magma' }, { name: 'Ooze' }], X = [{ name: 'Bat wings' }, { name: 'Antlers' }];

test('every combination gets its own readable name', () => {
  const names = new Set();
  for (const h of H) for (const b of B) for (const x of X) names.add(monsterName(h, b, x));
  assert.equal(names.size, 8);
  assert.equal(monsterName(H[0], B[0], X[0]), 'Magma Jack, bat-winged');
});

test('a combination is new once, then only counted', () => {
  const book = new Set();
  assert.deepEqual(record(book, codexKey([0, 1, 2])), { fresh: true, size: 1 });
  assert.deepEqual(record(book, codexKey([0, 1, 2])), { fresh: false, size: 1 });
  assert.equal(record(book, codexKey([1, 1, 2])).size, 2);
  assert.equal(TOTAL, 80);
});
