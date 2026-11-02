import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MASH_DUR, FALL_DUR, mashPose, fallPose } from '../src/anim.mjs';

const still = (p) => Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6 && Math.abs(p.rot) < 1e-6 && Math.abs(p.s - 1) < 1e-6;

test('the delivery dance starts and ends on the table, at full size', () => {
  assert.ok(still(mashPose(0)), JSON.stringify(mashPose(0)));
  assert.ok(still(mashPose(MASH_DUR)), JSON.stringify(mashPose(MASH_DUR)));
  assert.ok(still(mashPose(MASH_DUR + 5)));
});

test('the monster dances in place, then struts off to the right before the next one pops in', () => {
  const dance = mashPose(0.15);
  assert.ok(Math.abs(dance.x) < 1 && dance.y < -5, 'bounces up while dancing: ' + JSON.stringify(dance));
  assert.ok(mashPose(0.85).x > 200, 'off the table by 0.85 s: ' + JSON.stringify(mashPose(0.85)));
  const pop = mashPose(0.95);
  assert.ok(pop.x === 0 && pop.s < 1, 'the new monster pops in small, at the center: ' + JSON.stringify(pop));
});

test('on a miss every part falls apart and snaps back together', () => {
  for (const i of [0, 1, 2]) {
    assert.ok(still(fallPose(i, 0)), 'part ' + i + ' at 0 s');
    assert.ok(still(fallPose(i, FALL_DUR)), 'part ' + i + ' at the end');
  }
  const mid = [0, 1, 2].map((i) => fallPose(i, 0.45));
  assert.ok(mid.every((p) => p.y > 40), 'all parts dropped: ' + JSON.stringify(mid));
  assert.ok(mid[0].x < 0 && mid[2].x > 0, 'head and extra fly to opposite sides');
});
