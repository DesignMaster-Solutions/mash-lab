// Runs the real game loop in a fake DOM: 10 s of frames per scenario, failing on the first exception or a dead loop.
// The first animation frame is stamped BEFORE the script's performance.now(), as headless Chrome does (1.0.6 froze on the
// title there: negative dt, negative t, HEADS[-1]).
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function run(search, seconds = 10) {
  const strict = {
    arc: (x, y, r) => { if (!(r >= 0)) throw new RangeError('arc radius ' + r); },
    ellipse: (x, y, a, b) => { if (!(a >= 0 && b >= 0)) throw new RangeError('ellipse radius ' + a + ',' + b); },
    measureText: () => ({ width: 50 }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k in strict ? strict[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const cv = { width: 0, height: 0, dataset: {}, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  let now = 1000, raf = null;
  const timers = [];
  Object.assign(globalThis, {
    document: { getElementById: () => cv }, window: globalThis, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    location: { search }, localStorage: { getItem: () => null, setItem() {} }, addEventListener() {},
    performance: { now: () => now }, requestAnimationFrame: (f) => { raf = f; }, setTimeout: (f, ms) => timers.push({ f, at: 1000 + ms }),
  });
  const errors = [];
  console.error = (...a) => errors.push(a.join(' '));
  await import('../src/game.js?' + search + '&' + Math.random());
  const seen = new Set();
  now -= 5; // the frame began before the module finished
  for (let i = 0; i < seconds * 60; i++) {
    for (const tm of timers.filter((x) => !x.done && x.at <= now)) { tm.done = true; tm.f(); }
    const f = raf; raf = null;
    assert.ok(f, `loop dead at ${now} ms (state ${cv.dataset.state})`);
    f(now);
    seen.add(cv.dataset.state + ' ' + (cv.dataset.last || '') + ' ' + (cv.dataset.hints || ''));
    now += 16.7;
  }
  assert.deepEqual(errors, [], 'self-check found unsolvable orders');
  return { ds: cv.dataset, seen: [...seen] };
}

test('the title screen keeps animating even when the first frame is stamped early', async () => {
  const { ds } = await run('');
  assert.equal(ds.state, 'title');
});

test('autoplay: a right delivery dances, a wrong one tumbles, and the first order lights the hint boxes', async () => {
  const { ds, seen } = await run('?autoplay');
  assert.equal(ds.state, 'play');
  assert.equal(ds.last, 'fall 2');
  assert.ok(seen.some((s) => s.startsWith('play mash 1')), seen.join(' / '));
  assert.ok(seen.some((s) => s.startsWith('play ') && Number(s.split(' ').pop()) > 0), 'some boxes were lit: ' + seen.join(' / '));
});

test('poster mode draws the key art without errors', async () => {
  const { ds } = await run('?poster', 3);
  assert.equal(ds.state, 'poster');
});
