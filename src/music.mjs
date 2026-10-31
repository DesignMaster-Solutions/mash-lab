// The lab's march: an 8-bar E minor loop in 8th-note steps. Pure data so the scheduler in game.js stays tiny and this
// can be unit-tested without an AudioContext. MIDI numbers; null = rest.
export const BPM = 112;
export const STEPS = 64;
export const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);
// one bass note per half bar (beats 1 and 3): E2 E2 | E2 E2 | G2 G2 | A2 A2 | E2 E2 | E2 E2 | B2 B2 | G2 G2
const BASS = [40, 40, 40, 40, 43, 43, 45, 45, 40, 40, 40, 40, 47, 47, 43, 43];
const _ = null;
const LEAD = [
  64, _, 67, _, 64, _, 71, _,   69, 67, 64, _, 67, _, _, _,
  67, _, 71, _, 67, _, 74, _,   71, 69, 67, _, 69, _, _, _,
  64, _, 67, _, 64, _, 71, _,   69, 67, 64, _, 62, _, 64, _,
  71, _, 75, _, 71, _, 76, _,   74, 71, 69, _, 64, _, _, _,
];
export function patternAt(step) {
  const s = ((step % STEPS) + STEPS) % STEPS;
  return { bass: s % 4 === 0 ? BASS[s / 4] : null, lead: LEAD[s] };
}
