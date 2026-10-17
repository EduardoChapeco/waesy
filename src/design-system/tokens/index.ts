/**
 * Waesy Design System 4.0 — Canonical Token Dictionary
 * Source of Truth: docs/design/tokens.json & docs/design/DESIGN.md
 */

export const DS_COLORS = {
  canvas: "var(--canvas)",
  surface: "var(--surface)",
  surfaceRaised: "var(--surface-raised)",
  surfaceSubtle: "var(--surface-subtle)",
  surfaceHover: "var(--surface-hover)",
  surfaceActive: "var(--surface-active)",
  
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textTertiary: "var(--text-tertiary)",
  textDisabled: "var(--text-disabled)",
  textInverse: "var(--text-inverse)",

  borderSubtle: "var(--border-subtle)",
  borderDefault: "var(--border-default)",
  borderStrong: "var(--border-strong)",

  accent: "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentSoft: "var(--accent-soft)",

  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
} as const;

export const DS_RADIUS = {
  none: "0px",
  xs: "var(--radius-xs)", // 2px
  sm: "var(--radius-sm)", // 4px
  md: "var(--radius-md)", // 8px
  lg: "var(--radius-lg)", // 12px
  xl: "var(--radius-xl)", // 16px
  "2xl": "var(--radius-2xl)", // 24px
  pill: "var(--radius-pill)", // 9999px
} as const;

export const DS_SPACING = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export const DS_ELEVATION = {
  level0: "var(--elevation-0)",
  level1: "var(--elevation-1)",
  level2: "var(--elevation-2)",
  level3: "var(--elevation-3)",
  level4: "var(--elevation-4)",
} as const;

export const DS_LAYOUT = {
  railWidth: "64px",
  masterPanelWidth: "320px",
  maxWidthApp: "1440px",
  touchTargetMin: "44px",
} as const;

export type DSTokenColor = keyof typeof DS_COLORS;
export type DSTokenRadius = keyof typeof DS_RADIUS;
export type DSTokenSpacing = keyof typeof DS_SPACING;
export type DSTokenElevation = keyof typeof DS_ELEVATION;
