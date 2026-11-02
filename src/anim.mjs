// Delivery and miss animations as pure functions of elapsed seconds: the game loop only reads offsets, and the curves can be
// unit-tested without a canvas. Units are game pixels at scale 1 and radians.
export const MASH_DUR = 1.1;
export const FALL_DUR = 0.8;
const STILL = { x: 0, y: 0, rot: 0, s: 1 };
const backOut = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;

// The Monster Mash: two hops in place with a sway, a strut off to the right, then the next monster pops in at the center.
export function mashPose(e) {
  if (!(e > 0 && e < MASH_DUR)) return STILL;
  if (e < 0.5) {
    const b = e / 0.5;
    return { x: 0, y: -Math.abs(Math.sin(b * Math.PI * 2)) * 22, rot: Math.sin(b * Math.PI * 2) * 0.18, s: 1 + 0.06 * Math.sin(b * Math.PI * 4) };
  }
  if (e < 0.9) {
    const k = (e - 0.5) / 0.4;
    return { x: 420 * k * k, y: -Math.abs(Math.sin(k * Math.PI * 3)) * 14, rot: 0.25 * k, s: 1 };
  }
  return { x: 0, y: 0, rot: 0, s: 0.55 + 0.45 * backOut((e - 0.9) / (MASH_DUR - 0.9)) };
}

// A miss: head (0), body (1) and extra (2) tumble apart, head left and extra right, then stitch back together.
export function fallPose(i, e) {
  if (!(e > 0 && e < FALL_DUR)) return STILL;
  const dir = i - 1;
  const at = (k) => ({ x: dir * 70 * k, y: 160 * k * k * (0.7 + 0.15 * i), rot: (dir || 0.3) * 2.2 * k, s: 1 });
  if (e < 0.55) return at(e / 0.55);
  const end = at(1), f = (1 - (e - 0.55) / (FALL_DUR - 0.55)) ** 2;
  return { x: end.x * f, y: end.y * f, rot: end.rot * f, s: 1 };
}
