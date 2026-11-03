// Maps ESPN's light colors to dark ones. A color's job decides how it moves: a
// white background darkens while a white label stays white, so each job gets its
// own function. Colors that already work on dark (brand blues, team colors) pass
// through untouched.

globalThis.EspnDarkColors = (() => {
  const NAMED = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    silver: [192, 192, 192],
    whitesmoke: [245, 245, 245],
    gainsboro: [220, 220, 220],
    lightgray: [211, 211, 211],
    lightgrey: [211, 211, 211],
    darkgray: [169, 169, 169],
    darkgrey: [169, 169, 169],
    dimgray: [105, 105, 105],
    dimgrey: [105, 105, 105],
    navy: [0, 0, 128],
  };
  // The lookarounds keep names like --color-blue-700 from matching as colors.
  const TOKEN = new RegExp(
    `#[0-9a-f]{3,8}\\b|rgba?\\([^()]*\\)|(?<![\\w-])(?:${Object.keys(NAMED).join('|')})(?![\\w-])`,
    'gi',
  );
  // Below this spread between channels a color reads as gray, whatever its HSL
  // saturation says (near-whites like #f9f9fb report a high one).
  const NEUTRAL_CHROMA = 0.12;

  function parse(token) {
    const named = NAMED[token.toLowerCase()];
    if (named) return { rgb: named, a: 1 };
    if (token[0] === '#') {
      let hex = token.slice(1);
      if (hex.length < 6) hex = [...hex].map((c) => c + c).join('');
      if (hex.length !== 6 && hex.length !== 8) return null;
      const n = (i) => parseInt(hex.slice(i, i + 2), 16);
      return { rgb: [n(0), n(2), n(4)], a: hex.length === 8 ? n(6) / 255 : 1 };
    }
    const parts = token.slice(token.indexOf('(') + 1, -1).trim().split(/[\s,/]+/);
    const numbers = parts.map(Number);
    if (parts.length < 3 || numbers.some(Number.isNaN)) return null;
    return { rgb: numbers.slice(0, 3), a: numbers[3] ?? 1 };
  }

  function toHsl([red, green, blue]) {
    const [r, g, b] = [red / 255, green / 255, blue / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const c = max - min;
    const l = (max + min) / 2;
    const s = c === 0 ? 0 : c / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (c !== 0) {
      if (max === r) h = ((g - b) / c + 6) % 6;
      else if (max === g) h = (b - r) / c + 2;
      else h = (r - g) / c + 4;
    }
    return { h: h * 60, s, l, c };
  }

  function format({ h, s, l }, a) {
    const k = (n) => (n + h / 30) % 12;
    const amp = s * Math.min(l, 1 - l);
    const channel = (n) =>
      Math.round(255 * (l - amp * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    const rgb = `${channel(0)}, ${channel(8)}, ${channel(4)}`;
    return a === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${+a.toFixed(3)})`;
  }

  function background(color, a) {
    const { h, s, l, c } = color;
    // Faint black washes (table stripes, hover tints) would vanish on dark.
    if (l < 0.2 && a <= 0.15) return format({ h: 0, s: 0, l: 1 }, Math.min(a * 2, 0.2));
    if (l >= 0.85 || c < NEUTRAL_CHROMA) {
      if (l < 0.5) return null;
      const tinted = c >= 0.05;
      return format(
        { h, s: Math.min(s, tinted ? 0.4 : 0.1), l: 0.115 + (1 - l) * 0.45 + (tinted ? 0.04 : 0) },
        a,
      );
    }
    // Pastel chips would glare, and their labels are about to turn light.
    if (l > 0.6) return format({ h, s: Math.min(s, 0.6), l: l * 0.45 }, a);
    return null;
  }

  function text(color, a) {
    const { h, s, l, c } = color;
    if (l >= 0.62) return null;
    return format(c < NEUTRAL_CHROMA ? { h, s, l: 0.93 - l * 0.6 } : { h, s, l: 0.55 + l * 0.2 }, a);
  }

  function border(color, a) {
    const { h, s, l, c } = color;
    if (l < 0.2 && a < 0.5) return format({ h: 0, s: 0, l: 1 }, Math.min(a * 1.5, 0.3));
    // White borders are invisible on white cards, so they stay invisible on dark ones.
    if (l >= 0.97) return background(color, a);
    if (l > 0.4 && (l >= 0.85 || c < NEUTRAL_CHROMA)) {
      return format({ h, s: Math.min(s, 0.1), l: 0.24 + (1 - l) * 0.15 }, a);
    }
    return null;
  }

  // Dark shadows already work; only light ones would glow.
  function shadow(color, a) {
    return color.l > 0.5 ? background(color, a) : null;
  }

  const roles = { background, text, border, shadow };
  const memo = new Map();

  // Rewrites every color in a CSS value, leaving the rest of the value alone.
  function mapValue(value, role) {
    return value.replace(TOKEN, (token) => {
      const key = `${role}:${token}`;
      if (memo.has(key)) return memo.get(key);
      const parsed = parse(token);
      const mapped = parsed && roles[role](toHsl(parsed.rgb), parsed.a);
      memo.set(key, mapped ?? token);
      return mapped ?? token;
    });
  }

  return { mapValue };
})();
