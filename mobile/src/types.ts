// Shared domain types and enums for Wardrobe AI.
// These enum values MUST stay in sync with the backend prompt (backend/main.py).

export const ITEM_TYPES = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'accessory',
  'bag',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const COLORS = [
  'black',
  'white',
  'grey',
  'beige',
  'brown',
  'denim',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'navy',
  'purple',
  'pink',
] as const;
export type Color = (typeof COLORS)[number];

export const PATTERNS = [
  'solid',
  'striped',
  'plaid',
  'floral',
  'polka-dot',
  'graphic',
  'animal-print',
] as const;
export type Pattern = (typeof PATTERNS)[number];

export const STYLES = [
  'casual',
  'formal',
  'business',
  'sporty',
  'boho',
  'party',
] as const;
export type Style = (typeof STYLES)[number];

export const SEASONS = ['all', 'spring', 'summer', 'fall', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export interface ItemTags {
  type: ItemType;
  primary_color: Color;
  secondary_color: Color | null;
  pattern: Pattern;
  style: Style;
  season: Season;
}

export interface Item extends ItemTags {
  id: number;
  image_uri: string;
  favorite: boolean;
  created_at: string;
}

export interface Outfit {
  id: number;
  name: string;
  item_ids: number[];
  score: number;
  created_at: string;
}

/** Hex swatch used for the color-picker UI. */
export const COLOR_SWATCHES: Record<Color, string> = {
  black: '#1a1a1a',
  white: '#fafafa',
  grey: '#9e9e9e',
  beige: '#d9c7a7',
  brown: '#7b5236',
  denim: '#3f5f8a',
  red: '#d32f2f',
  orange: '#ef7f1a',
  yellow: '#f2c200',
  green: '#3d8b40',
  teal: '#00897b',
  blue: '#1e6fd9',
  navy: '#1f2a56',
  purple: '#7b40bf',
  pink: '#e5679b',
};

// Navigation params shared by all screens.
export type RootStackParamList = {
  Closet: undefined;
  AddItem: undefined;
  ItemDetail: { itemId: number };
  Match: { itemId: number };
  Outfits: undefined;
};
