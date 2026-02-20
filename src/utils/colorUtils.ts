/**
 * Color utilities for theme generation.
 * Generates 5 shades (light to dark) from a primary color using HSL.
 */

export interface HSL {
  h: number;
  s: number;
  l: number;
}

const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex);
}

/**
 * Converts hex color to HSL
 */
export function hexToHSL(hex: string): HSL {
  const result = HEX_REGEX.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates 5 shades from a primary (light to dark).
 * Uses primary's hue and saturation, varies lightness.
 */
export function generateShadesFromPrimary(primaryHex: string): string[] {
  const { h, s } = hexToHSL(primaryHex);
  const lightnessLevels = [92, 78, 64, 50, 36];
  return lightnessLevels.map((l) => hslToHex(h, s, l));
}

/**
 * Returns relative luminance (0–1) for a hex color.
 */
function getLuminance(hex: string): number {
  const result = HEX_REGEX.exec(hex);
  if (!result) return 0;

  const [r, g, b] = [result[1], result[2], result[3]].map((c) => {
    const val = parseInt(c, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns contrast ratio between two colors (1–21).
 */
function getContrastRatio(foreground: string, background: string): number {
  const L1 = getLuminance(foreground);
  const L2 = getLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns #010101 or #FFFFFF for text on the given background.
 * Picks the one with contrast >= 4.5; if both pass, picks higher contrast.
 */
export function getContrastTextColor(hexBackground: string): '#010101' | '#FFFFFF' {
  const black = '#010101';
  const white = '#FFFFFF';

  const ratioBlack = getContrastRatio(black, hexBackground);
  const ratioWhite = getContrastRatio(white, hexBackground);

  const blackPasses = ratioBlack >= 4.5;
  const whitePasses = ratioWhite >= 4.5;

  if (blackPasses && whitePasses) {
    return ratioBlack >= ratioWhite ? black : white;
  }
  if (blackPasses) return black;
  if (whitePasses) return white;
  return ratioBlack >= ratioWhite ? black : white;
}
