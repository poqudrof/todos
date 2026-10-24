// Styles of a document, used by the page and by the PDF. Colors are hex
// strings; `flags` is the bunting along the top (none for "classique").
export const THEMES = [
  {
    id: "fete",
    label: "Fête",
    emoji: "🎉",
    bg: "#fff4e6",
    dot: "#ffd8a8",
    accent: "#d9480f",
    soft: "#ffe8cc",
    ink: "#3b2a22",
    flags: ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8"],
    decor: ["🎈", "✨"],
    people: ["#ff6b6b", "#f59f00", "#37b24d", "#1c7ed6", "#ae3ec9", "#f76707"],
  },
  {
    id: "voyage",
    label: "Voyage",
    emoji: "🧳",
    bg: "#eef6ff",
    dot: "#cfe3ff",
    accent: "#1864ab",
    soft: "#dbeafe",
    ink: "#1b2b44",
    flags: ["#1c7ed6", "#74c0fc", "#ffd43b", "#ff8787", "#e7f5ff"],
    decor: ["✈️", "🗺️"],
    people: ["#1c7ed6", "#f08c00", "#e64980", "#0ca678", "#7048e8", "#e8590c"],
  },
  {
    id: "plage",
    label: "Plage",
    emoji: "🏖️",
    bg: "#e6fcf5",
    dot: "#b9f2df",
    accent: "#0b7285",
    soft: "#c5f6fa",
    ink: "#123c43",
    flags: ["#22b8cf", "#ffe066", "#ff922b", "#63e6be", "#e3fafc"],
    decor: ["🐚", "☀️"],
    people: ["#1098ad", "#f76707", "#e64980", "#2b8a3e", "#f59f00", "#5f3dc4"],
  },
  {
    id: "nature",
    label: "Jardin",
    emoji: "🌿",
    bg: "#f1f8ec",
    dot: "#d3eac2",
    accent: "#2b8a3e",
    soft: "#d8f5d0",
    ink: "#1f3524",
    flags: ["#2f9e44", "#94d82d", "#fab005", "#e8590c", "#a9e34b"],
    decor: ["🌼", "🐞"],
    people: ["#2b8a3e", "#e8590c", "#f59f00", "#5c940d", "#c2255c", "#1971c2"],
  },
  {
    id: "hiver",
    label: "Hiver",
    emoji: "❄️",
    bg: "#f3f6fb",
    dot: "#dbe4f0",
    accent: "#c92a2a",
    soft: "#ffe3e3",
    ink: "#2a1f24",
    flags: ["#c92a2a", "#2b8a3e", "#f1f3f5", "#fab005", "#1971c2"],
    decor: ["❄️", "🎄"],
    people: ["#c92a2a", "#2b8a3e", "#1971c2", "#e67700", "#862e9c", "#0b7285"],
  },
  {
    id: "douceur",
    label: "Douceur",
    emoji: "🧸",
    bg: "#fff0f6",
    dot: "#fcd5e8",
    accent: "#c2255c",
    soft: "#ffdeeb",
    ink: "#3d2531",
    flags: ["#fcc2d7", "#a5d8ff", "#ffec99", "#b2f2bb", "#d0bfff"],
    decor: ["⭐", "🌙"],
    people: ["#e64980", "#4dabf7", "#f59f00", "#40c057", "#9775fa", "#ff8787"],
  },
  {
    id: "classique",
    label: "Classique",
    emoji: "🖋️",
    bg: "#f8f5ef",
    dot: "#e6dfd1",
    accent: "#8a6d3b",
    soft: "#f1ebdf",
    ink: "#1f2a37",
    flags: null,
    decor: [],
    people: ["#1f2a37", "#8a6d3b", "#5c6f68", "#7c4d5e", "#3d5a80", "#6b5b3e"],
  },
];

export const DEFAULT_THEME = "fete";

// Words people may use for a theme.
const ALIASES = {
  fete: ["fete", "party", "anniversaire", "anniv", "birthday", "soiree"],
  voyage: ["voyage", "vacances", "travel", "trip", "valise", "weekend"],
  plage: ["plage", "mer", "beach", "ete", "summer"],
  nature: ["nature", "jardin", "camping", "pique-nique", "picnic", "foret"],
  hiver: ["hiver", "noel", "ski", "winter", "christmas", "neige"],
  douceur: ["douceur", "bebe", "naissance", "baby", "doux", "pastel"],
  classique: ["classique", "classic", "elegant", "sobre", "simple"],
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

// Each list gets a color from the theme, in order, so the page and the PDF
// match. The shared list uses the accent color.
export function listColor(theme, index) {
  return theme.people[index % theme.people.length];
}
