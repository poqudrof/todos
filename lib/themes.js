// Decorations of an event page. Colors are applied as CSS variables, so a
// theme only lives here.
export const THEMES = [
  {
    id: "fete",
    label: "Fête",
    emoji: "🎉",
    bg: "#fff4e6",
    dot: "#ffd8a8",
    accent: "#d9480f",
    soft: "#ffe8cc",
    flags: ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8"],
    decor: ["🎈", "🎉", "✨", "🎊"],
  },
  {
    id: "voyage",
    label: "Voyage",
    emoji: "🧳",
    bg: "#eef6ff",
    dot: "#cfe3ff",
    accent: "#1864ab",
    soft: "#dbeafe",
    flags: ["#1c7ed6", "#74c0fc", "#ffd43b", "#ff8787", "#ffffff"],
    decor: ["✈️", "🧳", "🗺️", "☁️"],
  },
  {
    id: "plage",
    label: "Plage",
    emoji: "🏖️",
    bg: "#e6fcf5",
    dot: "#b9f2df",
    accent: "#0b7285",
    soft: "#c5f6fa",
    flags: ["#22b8cf", "#ffe066", "#ff922b", "#63e6be", "#ffffff"],
    decor: ["🌊", "🐚", "☀️", "🏖️"],
  },
  {
    id: "nature",
    label: "Nature",
    emoji: "🌿",
    bg: "#f1f8ec",
    dot: "#d3eac2",
    accent: "#2b8a3e",
    soft: "#d8f5d0",
    flags: ["#2f9e44", "#94d82d", "#fab005", "#e8590c", "#a9e34b"],
    decor: ["🌿", "🍄", "🌼", "🐞"],
  },
  {
    id: "hiver",
    label: "Hiver",
    emoji: "❄️",
    bg: "#f3f6fb",
    dot: "#dbe4f0",
    accent: "#c92a2a",
    soft: "#ffe3e3",
    flags: ["#c92a2a", "#2b8a3e", "#ffffff", "#fab005", "#1971c2"],
    decor: ["❄️", "🎄", "⛄", "✨"],
  },
  {
    id: "douceur",
    label: "Douceur",
    emoji: "🧸",
    bg: "#fff0f6",
    dot: "#fcd5e8",
    accent: "#c2255c",
    soft: "#ffdeeb",
    flags: ["#fcc2d7", "#a5d8ff", "#ffec99", "#b2f2bb", "#d0bfff"],
    decor: ["🧸", "⭐", "🌙", "🍼"],
  },
];

export const DEFAULT_THEME = "fete";

// Words people (or agents) may use for a theme.
const ALIASES = {
  fete: ["fete", "party", "anniversaire", "anniv", "birthday", "soiree"],
  voyage: ["voyage", "vacances", "travel", "trip", "valise", "weekend"],
  plage: ["plage", "mer", "beach", "ete", "summer"],
  nature: [
    "nature",
    "camping",
    "pique-nique",
    "piquenique",
    "picnic",
    "foret",
    "rando",
  ],
  hiver: ["hiver", "noel", "ski", "winter", "christmas", "neige"],
  douceur: ["douceur", "bebe", "naissance", "baby", "doux", "pastel"],
};

function fold(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "")
    .trim();
}

export function themeId(name) {
  const key = fold(name);
  if (!key) return null;
  for (const [id, words] of Object.entries(ALIASES)) {
    if (words.some((word) => fold(word) === key)) return id;
  }
  return null;
}

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES[0];
}

// Soft colors given to people's cards, picked from their name so they stay
// the same on every device.
export const PERSON_COLORS = [
  "#ff8787",
  "#ffa94d",
  "#ffd43b",
  "#69db7c",
  "#38d9a9",
  "#4dabf7",
  "#9775fa",
  "#f783ac",
];

export function personColor(name) {
  let hash = 0;
  for (const char of fold(name)) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}
