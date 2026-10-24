// Plain-text format shared by people, AI agents and share links.
//
//   # 🧳 Week-end chez Mamie
//   @theme voyage
//   @date 2026-11-14
//   Parents : Lit bébé, tapis, habits
//   Achille 🦁 :
//   - Sac avec doudou
//   - [x] Pyjama
//
// A label followed by " :" starts a list; its items are separated by commas,
// semicolons or new lines. Everything can also sit on a single line.
import { createEvent, EVERYONE_NAME, norm, sortedLists } from "./model.js";
import { themeId } from "./themes.js";

const EMOJI =
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
  evenement: "title",
  event: "title",
  nom: "title",
  theme: "theme",
  decor: "theme",
  date: "date",
  quand: "date",
  emoji: "emoji",
  id: "id",
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
  let text = raw.trim().replace(/^(?:[-*•·]|\d+[.)])\s+/, "");
  let done = false;
  const box = text.match(/^\[([ xX✓✔])\]\s*/);
  if (box) {
    done = box[1] !== " ";
    text = text.slice(box[0].length);
  } else if (/^[✓✔✅]\s*/u.test(text)) {
    done = true;
    text = text.replace(/^[✓✔✅]\s*/u, "");
  }
  text = text.replace(/(?<!\.)\.$/, "").trim();
  return text ? { text, done } : null;
}

function parseItems(chunk) {
  return chunk
    .split(/[,;\n]/)
    .map(parseItem)
    .filter(Boolean);
}

// French dates such as "14/11/2026" are accepted besides "2026-11-14".
function parseDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const fr = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return "";
}

export function parseText(input) {
  const result = {
    title: "",
    emoji: "",
    theme: "",
    date: "",
    id: "",
    lists: [],
  };
  const body = [];
  const setMeta = (key, value) => {
    const field = META[norm(key)];
    if (!field) return false;
    const text = String(value || "").trim();
    if (field === "title") {
      const { name, emoji } = splitEmoji(text);
      result.title = name;
      if (emoji) result.emoji = emoji;
    } else if (field === "theme") result.theme = themeId(text) || "";
    else if (field === "date") result.date = parseDate(text);
    else result[field] = text.split(/\s+/)[0] || "";
    return true;
  };

  for (const line of String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")) {
    const trimmed = line.trim();
    if (/^#+\s*\S/.test(trimmed)) {
      setMeta("titre", trimmed.replace(/^#+\s*/, ""));
    } else if (/^@\w+/.test(trimmed)) {
      const [, key, value] = trimmed.match(/^@(\w+)\s*[:=]?\s*(.*)$/);
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
    if (META[norm(entry.label)]) setMeta(entry.label, items[0]?.text || "");
    else addList(entry.label, items);
  });

  return result;
}

export function eventFromText(text, extra = {}) {
  const parsed = parseText(text);
  return createEvent({ ...parsed, ...extra, id: extra.id || parsed.id });
}

export function eventToText(event) {
  const lines = [`# ${[event.emoji, event.title].filter(Boolean).join(" ")}`];
  lines.push(`@theme ${event.theme}`);
  if (event.date) lines.push(`@date ${event.date}`);
  lines.push(`@id ${event.id}`);
  for (const list of sortedLists(event)) {
    lines.push("", `${[list.name, list.emoji].filter(Boolean).join(" ")} :`);
    for (const item of list.items)
      lines.push(`- ${item.done ? "[x] " : ""}${item.text}`);
  }
  return lines.join("\n");
}
