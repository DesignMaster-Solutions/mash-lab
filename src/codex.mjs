// The Monster Book: every head x body x extra a player has delivered, with a name, so a run also fills a collection.
export const TOTAL = 4 * 4 * 5;
const EXTRA_WORD = { 'Bat wings': 'bat-winged', Tentacles: 'tentacled', Eyestalks: 'stalk-eyed', 'Moth wings': 'moth-winged', Antlers: 'antlered' };
export const monsterName = (h, b, x) => `${b.name} ${h.name}, ${EXTRA_WORD[x.name] || x.name.toLowerCase()}`;
export const codexKey = (pick) => pick.join('');
export function record(book, key) {
  const fresh = !book.has(key);
  book.add(key);
  return { fresh, size: book.size };
}
