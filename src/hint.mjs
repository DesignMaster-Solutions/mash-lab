// For each part box, the traits it would add that the order still lacks. The game lights these boxes during the first
// orders of a run so a new player learns the color code without reading a manual.
export function hintBoxes(rows, pick, need) {
  const have = new Set(rows.flatMap((r, i) => r[pick[i]].traits));
  const missing = need.filter((k) => !have.has(k));
  return rows.map((r) => r.map((p) => p.traits.filter((k) => missing.includes(k))));
}
