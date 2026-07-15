// Soft, feminine-friendly palette: warm neutrals with a rose accent.
export const theme = {
  colors: {
    background: '#faf7f4', // warm off-white
    surface: '#ffffff',
    surfaceAlt: '#f3ece6', // soft sand
    border: '#e8dfd7',
    text: '#3d3733',
    textMuted: '#8c8178',
    accent: '#d97b93', // dusty rose
    accentSoft: '#f7e4ea',
    onAccent: '#ffffff',
    success: '#7ba883',
    warning: '#c9a24b',
    danger: '#c25b5b',
  },
  radius: { sm: 8, md: 14, lg: 20 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  // Large touch targets throughout.
  touchTarget: 48,
} as const;
