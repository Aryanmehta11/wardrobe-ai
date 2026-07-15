// Pure rule-based outfit matching engine. No network, no side effects.
//
// Scoring rules (applied to a base of 50, then clamped/normalized to 0-100):
//   Color (12-hue wheel):
//     complementary hues (opposite on wheel)      +30
//     analogous hues (adjacent on wheel)          +25
//     same color family                           +15
//     neutral (black/white/grey/beige/brown/denim)
//       pairs with anything                       +20
//   Pattern:
//     two patterned items together                -25
//     solid + pattern                             +10
//   Style / formality:
//     same style                                  +15
//     formal + sporty clash                       -30

import { Color, Item } from '../types';

const NEUTRALS: ReadonlySet<Color> = new Set([
  'black',
  'white',
  'grey',
  'beige',
  'brown',
  'denim',
]);

// Position of each chromatic color on a 12-hue color wheel (0-11).
const HUE_INDEX: Partial<Record<Color, number>> = {
  red: 0,
  orange: 1,
  yellow: 2,
  green: 4,
  teal: 5,
  blue: 7,
  navy: 7, // navy is a dark blue; same hue slot
  purple: 9,
  pink: 11,
};

export interface MatchResult {
  item: Item;
  score: number;
  reason: string;
}

/** Circular distance between two positions on the 12-hue wheel. */
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

interface RuleHit {
  points: number;
  reason: string;
}

function colorRule(a: Color, b: Color): RuleHit {
  if (NEUTRALS.has(a) || NEUTRALS.has(b)) {
    const neutral = NEUTRALS.has(a) ? a : b;
    return { points: 20, reason: `${neutral} is a neutral that goes with anything` };
  }
  const ha = HUE_INDEX[a];
  const hb = HUE_INDEX[b];
  if (ha === undefined || hb === undefined) {
    return { points: 0, reason: '' };
  }
  const dist = hueDistance(ha, hb);
  if (dist === 6) {
    return { points: 30, reason: `${a} and ${b} are complementary colors` };
  }
  if (dist === 0) {
    const label = a === b ? `matching ${a} tones` : `${a} and ${b} are in the same color family`;
    return { points: 15, reason: label };
  }
  if (dist <= 1) {
    return { points: 25, reason: `${a} and ${b} sit next to each other on the color wheel` };
  }
  return { points: 0, reason: '' };
}

function patternRule(a: Item, b: Item): RuleHit {
  const aPatterned = a.pattern !== 'solid';
  const bPatterned = b.pattern !== 'solid';
  if (aPatterned && bPatterned) {
    return { points: -25, reason: 'two patterns compete with each other' };
  }
  if (aPatterned !== bPatterned) {
    return { points: 10, reason: 'a solid piece balances the pattern nicely' };
  }
  return { points: 0, reason: '' };
}

function styleRule(a: Item, b: Item): RuleHit {
  const clash =
    (a.style === 'formal' && b.style === 'sporty') ||
    (a.style === 'sporty' && b.style === 'formal');
  if (clash) {
    return { points: -30, reason: 'formal and sporty styles clash' };
  }
  if (a.style === b.style) {
    return { points: 15, reason: `both have a ${a.style} vibe` };
  }
  return { points: 0, reason: '' };
}

/**
 * Score how well two items pair, 0-100, with a human-readable reason.
 * Symmetric: scoreMatch(a, b) === scoreMatch(b, a).
 */
export function scoreMatch(
  itemA: Item,
  itemB: Item
): { score: number; reason: string } {
  const hits: RuleHit[] = [
    colorRule(itemA.primary_color, itemB.primary_color),
    patternRule(itemA, itemB),
    styleRule(itemA, itemB),
  ];

  const raw = 50 + hits.reduce((sum, h) => sum + h.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const positives = hits.filter((h) => h.points > 0 && h.reason);
  const negatives = hits.filter((h) => h.points < 0 && h.reason);
  let reason: string;
  if (positives.length === 0 && negatives.length === 0) {
    reason = 'No strong signals either way — a safe, if unremarkable, pairing.';
  } else {
    const parts = [...positives, ...negatives]
      .sort((x, y) => Math.abs(y.points) - Math.abs(x.points))
      .map((h) => h.reason);
    const sentence = parts.join('; ');
    reason = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
  }
  return { score, reason };
}

/**
 * Rank every other closet item against the given item, best first.
 * Items of the same garment type are excluded (you don't pair a top with a top),
 * except accessories/bags/shoes which can repeat across outfits but still not
 * against themselves.
 */
export function rankMatches(item: Item, closet: Item[]): MatchResult[] {
  return closet
    .filter((other) => other.id !== item.id && other.type !== item.type)
    .map((other) => {
      const { score, reason } = scoreMatch(item, other);
      return { item: other, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}
