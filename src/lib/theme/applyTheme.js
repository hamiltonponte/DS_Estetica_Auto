const DEFAULT_THEME = {
  accent: '#E63946',
  primary: '#E63946',
  secondary: '#A8A8A8',
};

const THEME_CSS_VARS = [
  '--accent',
  '--primary',
  '--ring',
  '--sidebar-primary',
  '--sidebar-ring',
  '--chart-1',
  '--brand-red',
];

function parseHex(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** Converte #RRGGBB para formato Tailwind: "358 91% 45%" */
export function hexToHslComponents(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return '358 91% 45%';

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
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
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyThemeFromColors(colors) {
  const palette = {
    accent: colors?.accent || DEFAULT_THEME.accent,
    primary: colors?.primary || colors?.accent || DEFAULT_THEME.primary,
    secondary: colors?.secondary || DEFAULT_THEME.secondary,
  };

  const root = document.documentElement;
  const accentHsl = hexToHslComponents(palette.accent);
  const primaryHsl = hexToHslComponents(palette.primary);

  root.style.setProperty('--accent', accentHsl);
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--ring', accentHsl);
  root.style.setProperty('--sidebar-primary', accentHsl);
  root.style.setProperty('--sidebar-ring', accentHsl);
  root.style.setProperty('--chart-1', accentHsl);
  root.style.setProperty('--brand-red', accentHsl);

  return palette;
}

export function resetThemeToDefault() {
  THEME_CSS_VARS.forEach((prop) => {
    document.documentElement.style.removeProperty(prop);
  });
}

export function getDefaultThemeColors() {
  return { ...DEFAULT_THEME };
}
