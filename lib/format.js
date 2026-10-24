// Plain-text format to write or paste lists, and to share them by link.
//
//   # 🧳 Week-end chez Mamie
//   ## Tout ce qu'il ne faut pas oublier
//   @theme voyage
//   @pages chacun
//   Parents : Lit bébé, tapis, habits
//   Achille 🦁 :
//   - Sac avec doudou
//
// A label followed by " :" starts a list; its items are separated by commas,
// semicolons or new lines. Everything can also sit on a single line.
import {
  createDoc,
  DEFAULT_PDF,
  EVERYONE_NAME,
  LAYOUTS,
  norm,
  sortedLists,
} from "./model.js";
import { themeId } from "./themes.js";

export const EMOJI =
  "(?:\\p{Extended_Pictographic}|\\p{Regional_Indicator}{2})(?:\\ufe0f|\\p{Emoji_Modifier})?(?:\\u200d\\p{Extended_Pictographic}(?:\\ufe0f|\\p{Emoji_Modifier})?)*";
const LEADING_EMOJI = new RegExp(`^\\s*(${EMOJI})\\s*`, "u");
const TRAILING_EMOJI = new RegExp(`\\s*(${EMOJI})\\s*$`, "u");

// A label sits at the start of the text or after a separator, does not start
// with a bullet, and is followed by a colon then a space or the end of line
// (so "10:30" or "https://" are never labels).
const LABEL =
  /(^|[,;\n])[ \t]*([^,;\n:\-*•·\[\s][^,;\n:]{0,47}?)[ \t]*:(?=\s|$)/g;

const META = {
  titre: "title",
  title: "title",
  nom: "title",
  "sous-titre": "subtitle",
  soustitre: "subtitle",
  subtitle: "subtitle",
  theme: "theme",
  decor: "theme",
  style: "theme",
  emoji: "emoji",
  id: "id",
  pages: "layout",
  "mise-en-page": "layout",
  orientation: "orientation",
  lignes: "blankLines",
  cases: "boxes",
};

export function splitEmoji(label) {
  const text = String(label ?? "").trim();
  const lead = text.match(LEADING_EMOJI);
  if (lead && text.length > lead[0].length) {
    return { name: text.slice(lead[0].length).trim(), emoji: lead[1] };
  }
  const trail = text.match(TRAILING_EMOJI);
  if (trail && text.length > trail[0].length) {
    return { name: text.slice(0, -trail[0].length).trim(), emoji: trail[1] };
  }
  return { name: text, emoji: "" };
}

function parseItem(raw) {
  const text = raw
    .trim()
    .replace(/^(?:[-*•·]|\d+[.)])\s+/, "")
    .replace(/^\[[ xX✓✔]?\]\s*/, "")
    .replace(/(?<!\.)\.$/, "")
    .trim();
  return text || null;
}

function parseItems(chunk) {
  return chunk
    .split(/[,;\n]/)
    .map(parseItem)
    .filter(Boolean);
}

function parseLayout(value) {
  const key = norm(value).replace(/\s+/g, "-");
  if (LAYOUTS.includes(key)) return key;
  if (/deux|both|tout/.test(key)) return "les-deux";
  if (/chacun|personne|liste|each/.test(key)) return "chacun";
  if (/une|one|seule/.test(key)) return "une";
  return undefined;
}

export function parseText(input) {
  const result = {
    title: "",
    subtitle: "",
    emoji: "",
    theme: "",
    id: "",
    pdf: {},
    lists: [],
  };
  const body = [];
  const setMeta = (key, value) => {
    const field = META[norm(key).replace(/\s+/g, "-")];
    if (!field) return false;
    const text = String(value || "").trim();
    if (field === "title") {
      const { name, emoji } = splitEmoji(text);
      result.title = name;
      if (emoji) result.emoji = emoji;
    } else if (field === "subtitle") result.subtitle = text;
    else if (field === "theme") result.theme = themeId(text) || "";
    else if (field === "emoji" || field === "id") {
      result[field] = text.split(/\s+/)[0] || "";
    } else if (field === "layout") {
      const layout = parseLayout(text);
      if (layout) result.pdf.layout = layout;
    } else if (field === "orientation") {
      result.pdf.orientation = /pays|land/.test(norm(text))
        ? "paysage"
        : "portrait";
    } else if (field === "blankLines") {
      const lines = parseInt(text, 10);
      if (Number.isFinite(lines)) result.pdf.blankLines = lines;
    } else if (field === "boxes") {
      result.pdf.boxes = /rond/.test(norm(text)) ? "rondes" : "carrees";
    }
    return true;
  };

  for (const line of String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")) {
    const trimmed = line.trim();
    if (/^##\s*\S/.test(trimmed)) {
      setMeta("sous-titre", trimmed.replace(/^##\s*/, ""));
    } else if (/^#\s*\S/.test(trimmed)) {
      setMeta("titre", trimmed.replace(/^#\s*/, ""));
    } else if (/^@[\w-]+/.test(trimmed)) {
      const [, key, value] = trimmed.match(/^@([\w-]+)\s*[:=]?\s*(.*)$/);
      setMeta(key, value);
    } else body.push(line);
  }

  const text = body.join("\n");
  const labels = [...text.matchAll(LABEL)].map((match) => ({
    label: match[2].trim(),
    start: match.index + match[1].length,
    end: match.index + match[0].length,
  }));

  const addList = (label, items) => {
    const { name, emoji } = splitEmoji(label);
    const twin = result.lists.find((list) => norm(list.name) === norm(name));
    if (twin) {
      twin.items.push(...items);
      if (emoji && !twin.emoji) twin.emoji = emoji;
    } else result.lists.push({ name, emoji, items });
  };

  const before = parseItems(text.slice(0, labels[0]?.start ?? text.length));
  if (before.length) addList(EVERYONE_NAME, before);

  labels.forEach((entry, index) => {
    const chunk = text.slice(
      entry.end,
      labels[index + 1]?.start ?? text.length,
    );
    const items = parseItems(chunk);
    if (META[norm(entry.label).replace(/\s+/g, "-")]) {
      setMeta(entry.label, items[0] || "");
    } else addList(entry.label, items);
  });

  return result;
}

export function docFromText(text, extra = {}) {
  const parsed = parseText(text);
  return createDoc({ ...parsed, ...extra, id: extra.id || parsed.id });
}

export function docToText(doc) {
  const lines = [`# ${[doc.emoji, doc.title].filter(Boolean).join(" ")}`];
  if (doc.subtitle) lines.push(`## ${doc.subtitle}`);
  lines.push(`@theme ${doc.theme}`);
  const pdf = doc.pdf || DEFAULT_PDF;
  if (pdf.layout !== DEFAULT_PDF.layout) lines.push(`@pages ${pdf.layout}`);
  if (pdf.orientation !== DEFAULT_PDF.orientation) {
    lines.push(`@orientation ${pdf.orientation}`);
  }
  if (pdf.blankLines) lines.push(`@lignes ${pdf.blankLines}`);
  if (pdf.boxes !== DEFAULT_PDF.boxes) lines.push(`@cases ${pdf.boxes}`);
  lines.push(`@id ${doc.id}`);
  for (const list of sortedLists(doc)) {
    lines.push("", `${[list.name, list.emoji].filter(Boolean).join(" ")} :`);
    for (const item of list.items) lines.push(`- ${item.text}`);
  }
  return lines.join("\n");
}
