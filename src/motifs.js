// Folk-art motifs, drawn as filled silhouettes in a 24×24 box (even-odd fill makes the holes).
// They are packed edge to edge into dense, hand-printed looking patterns.
const polar = (n, f, cx = 12, cy = 12, R = 11) => {
  let d = '';
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2, r = f(t) * R; d += `${i ? 'L' : 'M'}${(cx + Math.cos(t - Math.PI / 2) * r).toFixed(2)} ${(cy + Math.sin(t - Math.PI / 2) * r).toFixed(2)}`; }
  return d + 'Z';
};
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const star = (pts, inner, R = 11) => { let d = ''; for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / pts, r = i % 2 ? R * inner : R; d += `${i ? 'L' : 'M'}${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`; } return d + 'Z'; };
const sunRays = (() => { let d = circ(12, 12, 6); for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6, p = (r, o) => `${(12 + Math.cos(a) * r - Math.sin(a) * o).toFixed(2)} ${(12 + Math.sin(a) * r + Math.cos(a) * o).toFixed(2)}`; d += `M${p(7.4, -1.6)}L${p(11.6, 0)}L${p(7.4, 1.6)}Z`; } return d; })();
const citrus = (() => { let d = circ(12, 12, 11) + circ(12, 12, 9.4); for (let i = 0; i < 8; i++) { const a0 = (i * Math.PI) / 4 + 0.12, a1 = ((i + 1) * Math.PI) / 4 - 0.12, p = (a, r) => `${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`; d += `M${p((a0 + a1) / 2, 1.4)}L${p(a0, 8.3)}A8.3 8.3 0 0 1 ${p(a1, 8.3)}Z`; } return d; })();

export const MOTIFS = {
  flower: polar(120, (t) => 0.45 + 0.55 * Math.abs(Math.sin(2.5 * t))) + circ(12, 12, 2.6),
  daisy: polar(160, (t) => 0.5 + 0.5 * Math.abs(Math.sin(4 * t)) ** 0.7) + circ(12, 12, 3.2) + circ(12, 12, 2),
  star: star(5, 0.45),
  sparkle: polar(160, (t) => 1 / (Math.abs(Math.cos(t)) ** 0.6 + Math.abs(Math.sin(t)) ** 0.6) ** 2.2),
  heart: (() => { let d = ''; for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); d += `${i ? 'L' : 'M'}${(12 + x * 0.66).toFixed(2)} ${(12.6 + y * 0.66).toFixed(2)}`; } return d + 'Z'; })(),
  leaf: 'M12 1.5C5 7 4.5 16 12 22.5C19.5 16 19 7 12 1.5Z M12.6 5.5v14.5h-1.2V5.5Z',
  sun: sunRays + circ(10, 11, 0.9) + circ(14, 11, 0.9),
  moon: 'M15 2a10 10 0 1 0 7 16.5A8.2 8.2 0 1 1 15 2Z',
  eye: 'M1.5 12C5.5 5 18.5 5 22.5 12C18.5 19 5.5 19 1.5 12Z' + circ(12, 12, 4.2) + circ(12, 12, 2.2),
  hand: 'M7.2 22.5C5.2 20 4.6 16.6 4.6 13.6V8a1.4 1.4 0 0 1 2.8 0v4.6V4.6a1.4 1.4 0 0 1 2.8 0V12V3.4a1.4 1.4 0 0 1 2.8 0V12V5a1.4 1.4 0 0 1 2.8 0v9l1.5-2.4a1.5 1.5 0 0 1 2.6 1.4L17 20.2c-1.1 1.6-2.6 2.3-4.6 2.3Z' + circ(11.5, 16, 1.6),
  flame: 'M12 1.5c1.2 4.2 6.5 6.4 6.5 12.5a6.5 6.5 0 0 1-13 0c0-3.2 2-5.3 3.2-7.4.1 2.2 1 3.4 2.2 3.6-.2-3.2-.6-5.6 1.1-8.7Z',
  paisley: 'M8.5 22.5a6.6 6.6 0 0 1-2.4-12.8C9.4 8.2 13.6 6.8 15.6 1.5c3.6 5.4 3.6 12.2-.6 16.8-2 2.2-4.2 4.2-6.5 4.2Z' + circ(8.8, 16, 2.6),
  bird: 'M2 14.5c3.4.2 5.6-2 7.4-5.4 1.9-3.4 5-4.6 8.4-3.4L21.5 4l-1.6 3.6c.6 6.8-4.4 11.6-11 11.4-2.8-.1-5.4-1.4-6.9-4.5Z' + circ(16.4, 8.4, 0.9),
  fish: 'M1.5 12c4.4-5.6 11-6.6 15.8-2.2L22.5 5.5v13l-5.2-4.3C12.5 18.6 5.9 17.6 1.5 12Z' + circ(7.4, 11, 1.1),
  cherry: circ(7, 18.5, 3.6) + circ(16.5, 17.5, 3.6) + 'M6.8 15.4C7.4 10 9.6 5.8 14 2.6l.9.9C11.2 6.6 9.2 10.5 8.6 15.4Z M15.8 14.2c-.6-4-1.6-7.2-2.4-10.8l1-.3c1 3.6 2.1 6.8 2.8 11Z',
  butterfly: 'M12 8.5C9 3 2.5 2.8 2.5 7.6S8 13.4 12 11.8Z M12 8.5c3-5.5 9.5-5.7 9.5-.9S16 13.4 12 11.8Z M12 12.4c-3 0-7.4 1.6-6.8 5.2S10 20 12 14.6Z M12 12.4c3 0 7.4 1.6 6.8 5.2S14 20 12 14.6Z',
  citrus,
  chilli: 'M3 21c6.4.4 13.4-4.2 15.6-12.4l1.6-1.2-1-1.4c-2 .8-3 2-3.3 4-2.2 5.4-6.6 8.6-12.9 9.4Z M18.2 6.6c.4-2 1.6-3.6 3.3-4.6l.6.9c-1.5.9-2.4 2.2-2.7 3.9Z',
  mushroom: 'M2.5 12.5a9.5 8.4 0 0 1 19 0Z M9 12.5h6v6.3a3 2.2 0 0 1-6 0Z' + circ(8, 8.6, 1.3) + circ(15.5, 9, 1.1),
  diamond: 'M12 1.5L21 12L12 22.5L3 12Z M12 7L16.5 12L12 17L7.5 12Z',
  dot: circ(12, 12, 5),
};
export const MOTIF_SETS = {
  food: ['citrus', 'cherry', 'leaf', 'flower', 'star', 'heart', 'sparkle', 'daisy', 'chilli', 'dot'],
  beauty: ['flower', 'daisy', 'leaf', 'butterfly', 'sparkle', 'heart', 'moon', 'star', 'dot'],
  drink: ['citrus', 'leaf', 'sun', 'star', 'sparkle', 'bird', 'flower', 'dot'],
  folk: ['flower', 'eye', 'hand', 'sun', 'moon', 'star', 'leaf', 'heart', 'paisley', 'flame', 'bird', 'butterfly', 'diamond', 'sparkle'],
  cute: ['heart', 'star', 'daisy', 'mushroom', 'butterfly', 'cherry', 'sparkle', 'flower', 'moon', 'dot'],
};
export function motifSetFor(text = '') {
  const t = String(text).toLowerCase(), has = (w) => w.some((x) => t.includes(x));
  if (has(['jam', 'fruit', 'snack', 'spice', 'masala', 'chutney', 'pickle', 'sauce', 'honey', 'cookie', 'chocolate', 'sweet', 'food', 'bake'])) return MOTIF_SETS.food;
  if (has(['skin', 'cream', 'serum', 'soap', 'beauty', 'nail', 'perfume', 'candle', 'oil'])) return MOTIF_SETS.beauty;
  if (has(['juice', 'drink', 'tea', 'coffee', 'soda', 'beer', 'wine', 'water', 'kombucha', 'lemonade'])) return MOTIF_SETS.drink;
  if (has(['kid', 'cute', 'toy', 'magnet', 'sticker', 'keychain', 'candy', 'gift'])) return MOTIF_SETS.cute;
  return MOTIF_SETS.folk;
}
