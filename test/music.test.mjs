import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BPM, STEPS, midiFreq, patternAt } from '../src/music.mjs';

test('A4 is 440 Hz and the tempo is a march', () => {
  assert.equal(midiFreq(69), 440);
  assert.equal(midiFreq(57), 220);
  assert.ok(BPM >= 90 && BPM <= 130);
});

test('the loop is 8 bars of 8th notes, wraps, and every note is in range', () => {
  assert.equal(STEPS, 64);
  for (let s = 0; s < STEPS * 2; s++) {
    const { bass, lead } = patternAt(s);
    assert.deepEqual(patternAt(s), patternAt(s + STEPS));
    if (bass) assert.ok(bass >= 36 && bass <= 60, 'bass ' + bass + ' at ' + s);
    if (lead) assert.ok(lead >= 55 && lead <= 84, 'lead ' + lead + ' at ' + s);
  }
});

test('bass hits on beats 1 and 3 of every bar and the lead plays at least half the steps', () => {
  let leads = 0;
  for (let s = 0; s < STEPS; s++) {
    const { bass, lead } = patternAt(s);
    if (s % 4 === 0) assert.ok(bass, 'no bass on beat at step ' + s); else assert.equal(bass, null);
    if (lead) leads++;
  }
  assert.ok(leads >= STEPS / 2, 'only ' + leads + ' lead notes');
});
