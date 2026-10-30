// Lines for the game-over board: the player's rank first, then the top entries, names clipped to fit the 400 px column.
export function boardLines(me, entries, limit = 5) {
  const lines = [];
  if (me && me.rank) lines.push(`You: #${me.rank} of ${me.totalPlayers}`);
  (entries || []).slice(0, limit).forEach((e, i) => lines.push(`${e.rank ?? i + 1}. ${String(e.username || 'Masher').slice(0, 14)}  ${e.score}`));
  return lines;
}
