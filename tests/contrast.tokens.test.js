import { describe, it, expect } from 'vitest';

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const channel = (value) => {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (foreground, background) => {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
};

const TOKENS = {
  bg: '#FFF7E8',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#334155',
  primary: '#C2410C',
  secondary: '#1D4ED8',
  accent: '#0F766E',
  success: '#14532D',
  white: '#FFFFFF',
};

describe('child-mode contrast tokens', () => {
  it('meets 4.5:1 for body text pairs', () => {
    expect(contrast(TOKENS.text, TOKENS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.text, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.textMuted, TOKENS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.textMuted, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('meets 4.5:1 for primary interactive text', () => {
    expect(contrast(TOKENS.white, TOKENS.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.white, TOKENS.secondary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.white, TOKENS.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.white, TOKENS.success)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps accent text readable on light surfaces', () => {
    expect(contrast(TOKENS.primary, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.secondary, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TOKENS.accent, TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('meets 3:1 for icon-level large contrast', () => {
    expect(contrast(TOKENS.primary, TOKENS.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(TOKENS.secondary, TOKENS.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(TOKENS.accent, TOKENS.bg)).toBeGreaterThanOrEqual(3);
  });
});
