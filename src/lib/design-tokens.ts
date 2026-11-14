import tokensJson from "../../docs/design/tokens.json";

const c = tokensJson.primitive.color;

/**
 * Paleta de cores primitivas derivada diretamente da SSOT `docs/design/tokens.json`.
 * Uso restrito a APIs imperativas que exigem string hexadecimal/CSS (ex.: Canvas 2D,
 * Manifesto PWA W3C, <input type="color">, geradores de recibo e seeds de tema).
 */
export const TOKEN_HEX = {
  white: c.neutral["0"].$value,
  neutral50: c.neutral["50"].$value,
  neutral100: c.neutral["100"].$value,
  neutral200: c.neutral["200"].$value,
  neutral300: c.neutral["300"].$value,
  neutral400: c.neutral["400"].$value,
  neutral500: c.neutral["500"].$value,
  neutral600: c.neutral["600"].$value,
  neutral700: c.neutral["700"].$value,
  neutral800: c.neutral["800"].$value,
  neutral900: c.neutral["900"].$value,
  neutral950: c.neutral["950"].$value,
  accentDefault: c.accent.default.$value,
  accentHover: c.accent.hover.$value,
  accentSoft: c.accent.soft.$value,
  red50: c.red["50"].$value,
  red100: c.red["100"].$value,
  red500: c.red["500"].$value,
  red600: c.red["600"].$value,
  red700: c.red["700"].$value,
  green50: c.green["50"].$value,
  green100: c.green["100"].$value,
  green500: c.green["500"].$value,
  green600: c.green["600"].$value,
  green700: c.green["700"].$value,
  amber50: c.amber["50"].$value,
  amber100: c.amber["100"].$value,
  amber500: c.amber["500"].$value,
  amber600: c.amber["600"].$value,
  amber700: c.amber["700"].$value,
  blue50: c.blue["50"].$value,
  blue100: c.blue["100"].$value,
  blue500: c.blue["500"].$value,
  blue600: c.blue["600"].$value,
  blue700: c.blue["700"].$value,
} as const;
