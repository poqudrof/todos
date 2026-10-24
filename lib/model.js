// A document has a title and one or more lists: one list for a shopping
// list, several for a "list of lists" (one per person, per shelf…). A list
// named "Tout le monde" is shared and shown first. Every function returns a
// new document and leaves its input untouched.
import { DEFAULT_THEME, themeId } from "./themes.js";

export const EVERYONE_NAME = "Tout le monde";
const EVERYONE_NAMES = [
  "tout le monde",
  "pour tout le monde",
  "tous",
  "pour tous",
  "commun",
  "en commun",
  "ensemble",
  "everyone",
  "all",
];

// How the PDF is laid out.
export const LAYOUTS = ["une", "chacun", "les-deux"];
export const DEFAULT_PDF = {
  layout: "une", // everything on one page, one page per list, or both
  orientation: "portrait", // or "paysage"
  blankLines: 0, // empty lines added to each list, to write by hand
  freeLines: 0, // size of an extra list with no name, all filled by hand
  boxes: "carrees", // or "rondes"
};

export function norm(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isEveryone(listOrName) {
  const name = typeof listOrName === "string" ? listOrName : listOrName?.name;
  return EVERYONE_NAMES.includes(norm(name));
}

export function makeId() {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toItem(input) {
  const text = typeof input === "string" ? input : input?.text;
  return { id: makeId(), text: cleanText(text) };
}

function toList(input) {
  const list = typeof input === "string" ? { name: input } : input || {};
  return {
    id: makeId(),
    name: cleanText(list.name) || EVERYONE_NAME,
    emoji: cleanText(list.emoji),
    items: dedupe((list.items || []).map(toItem).filter((item) => item.text)),
  };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = norm(item.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const MAX_BLANK_LINES = 10;
export const MAX_FREE_LINES = 20;

function count(value, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

export function cleanPdf(pdf = {}) {
  return {
    layout: LAYOUTS.includes(pdf.layout) ? pdf.layout : DEFAULT_PDF.layout,
    orientation: pdf.orientation === "paysage" ? "paysage" : "portrait",
    blankLines: count(pdf.blankLines, MAX_BLANK_LINES),
    freeLines: count(pdf.freeLines, MAX_FREE_LINES),
    boxes: pdf.boxes === "rondes" ? "rondes" : "carrees",
  };
}

export function createDoc(fields = {}) {
  const lists = [];
  for (const input of fields.lists || []) {
    const list = toList(input);
    const twin = lists.find((other) => norm(other.name) === norm(list.name));
    if (twin) twin.items = dedupe([...twin.items, ...list.items]);
    else lists.push(list);
  }
  const stamp = new Date().toISOString();
  return {
    id: cleanText(fields.id) || makeId(),
    title: cleanText(fields.title) || "Ma liste",
    subtitle: cleanText(fields.subtitle),
    emoji: cleanText(fields.emoji),
    theme: themeId(fields.theme) || DEFAULT_THEME,
    pdf: cleanPdf(fields.pdf),
    lists,
    createdAt: fields.createdAt || stamp,
    updatedAt: stamp,
  };
}

function edit(doc, change) {
  const next = structuredClone(doc);
  change(next);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function findList(doc, ref) {
  if (ref && typeof ref === "object") ref = ref.id ?? ref.name;
  const key = norm(ref);
  return (
    doc.lists.find((list) => list.id === ref) ||
    doc.lists.find((list) => norm(list.name) === key) ||
    (isEveryone(key) ? doc.lists.find(isEveryone) : undefined)
  );
}

export function findItem(list, ref) {
  if (ref && typeof ref === "object") ref = ref.id ?? ref.text;
  const key = norm(ref);
  if (!key) return undefined;
  return (
    list.items.find((item) => item.id === ref) ||
    list.items.find((item) => norm(item.text) === key) ||
    list.items.find((item) => norm(item.text).startsWith(key))
  );
}

function requireList(doc, ref) {
  const list = findList(doc, ref);
  if (!list) {
    const names = doc.lists.map((l) => `"${l.name}"`).join(", ") || "aucune";
    throw new Error(`Liste introuvable : "${ref}". Listes : ${names}.`);
  }
  return list;
}

function requireItem(list, ref) {
  const item = findItem(list, ref);
  if (!item) {
    throw new Error(`Élément introuvable dans "${list.name}" : "${ref}".`);
  }
  return item;
}

export function updateDoc(doc, patch = {}) {
  return edit(doc, (next) => {
    if ("title" in patch) next.title = cleanText(patch.title) || next.title;
    if ("subtitle" in patch) next.subtitle = cleanText(patch.subtitle);
    if ("emoji" in patch) next.emoji = cleanText(patch.emoji);
    if ("theme" in patch) next.theme = themeId(patch.theme) || next.theme;
    if ("pdf" in patch) next.pdf = cleanPdf({ ...next.pdf, ...patch.pdf });
  });
}

function insertList(doc, list) {
  if (isEveryone(list)) doc.lists.unshift(list);
  else doc.lists.push(list);
}

export function addList(doc, fields) {
  const list = toList(fields);
  if (findList(doc, list.name)) return addItems(doc, list.name, list.items);
  return edit(doc, (next) => insertList(next, list));
}

export function updateList(doc, ref, patch = {}) {
  return edit(doc, (next) => {
    const list = requireList(next, ref);
    if ("name" in patch && cleanText(patch.name)) {
      const twin = findList(next, patch.name);
      if (twin && twin.id !== list.id) {
        throw new Error(`Une liste "${twin.name}" existe déjà.`);
      }
      list.name = cleanText(patch.name);
    }
    if ("emoji" in patch) list.emoji = cleanText(patch.emoji);
  });
}

export function removeList(doc, ref) {
  return edit(doc, (next) => {
    const list = requireList(next, ref);
    next.lists = next.lists.filter((other) => other.id !== list.id);
  });
}

export function moveList(doc, ref, delta) {
  return edit(doc, (next) => {
    const list = requireList(next, ref);
    const from = next.lists.indexOf(list);
    const to = Math.max(0, Math.min(next.lists.length - 1, from + delta));
    next.lists.splice(from, 1);
    next.lists.splice(to, 0, list);
  });
}

export function splitItems(text) {
  return String(text)
    .split(/[,;\n]/)
    .map(cleanText)
    .filter(Boolean);
}

// Adds items to a list, creating the list when needed. Items already there
// are skipped, so repeating the same call changes nothing.
export function addItems(doc, ref, items) {
  const entries = (Array.isArray(items) ? items : [items])
    .flatMap((item) => (typeof item === "string" ? splitItems(item) : [item]))
    .map(toItem)
    .filter((item) => item.text);
  return edit(doc, (next) => {
    let list = findList(next, ref);
    if (!list) {
      list = toList({ name: ref });
      insertList(next, list);
    }
    for (const item of entries) {
      if (!list.items.some((other) => norm(other.text) === norm(item.text))) {
        list.items.push(item);
      }
    }
  });
}

export function updateItem(doc, listRef, itemRef, text) {
  return edit(doc, (next) => {
    const item = requireItem(requireList(next, listRef), itemRef);
    if (cleanText(text)) item.text = cleanText(text);
  });
}

export function removeItem(doc, listRef, itemRef) {
  return edit(doc, (next) => {
    const list = requireList(next, listRef);
    const item = requireItem(list, itemRef);
    list.items = list.items.filter((other) => other.id !== item.id);
  });
}

export function moveItem(doc, listRef, itemRef, delta) {
  return edit(doc, (next) => {
    const list = requireList(next, listRef);
    const item = requireItem(list, itemRef);
    const from = list.items.indexOf(item);
    const to = Math.max(0, Math.min(list.items.length - 1, from + delta));
    list.items.splice(from, 1);
    list.items.splice(to, 0, item);
  });
}

// Moves an item to another list (from "Parents" to "Tout le monde"…).
export function moveItemTo(doc, listRef, itemRef, targetRef) {
  const item = requireItem(requireList(doc, listRef), itemRef);
  return addItems(removeItem(doc, listRef, item.id), targetRef, [item.text]);
}

// Adds the lists and items of a parsed text. Header fields replace the
// current ones only when the text has them.
export function mergeInto(doc, parsed) {
  let next = doc;
  const patch = {};
  for (const key of ["title", "subtitle", "emoji", "theme"]) {
    if (parsed[key]) patch[key] = parsed[key];
  }
  if (parsed.pdf && Object.keys(parsed.pdf).length) patch.pdf = parsed.pdf;
  if (Object.keys(patch).length) next = updateDoc(next, patch);
  for (const list of parsed.lists || []) {
    next = addList(next, { name: list.name });
    if (list.emoji) next = updateList(next, list.name, { emoji: list.emoji });
    next = addItems(next, list.name, list.items || []);
  }
  return next;
}

export function countItems(doc) {
  return doc.lists.reduce((sum, list) => sum + list.items.length, 0);
}

// The shared list first, then the others in their own order.
export function sortedLists(doc) {
  return [
    ...doc.lists.filter(isEveryone),
    ...doc.lists.filter((l) => !isEveryone(l)),
  ];
}

// Color of each list, by id: the accent for the shared list, then the
// theme's colors in order, so the page and the PDF match.
export function listColors(doc, theme) {
  const colors = new Map();
  let index = 0;
  for (const list of sortedLists(doc)) {
    colors.set(
      list.id,
      isEveryone(list)
        ? theme.accent
        : theme.people[index++ % theme.people.length],
    );
  }
  return colors;
}
