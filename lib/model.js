// An event holds one checklist per person or group, plus an optional
// "everyone" list. Every function returns a new event and leaves its input
// untouched, so the same code serves the page, the agent API and the tests.
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

function now() {
  return new Date().toISOString();
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toItem(input) {
  const item = typeof input === "string" ? { text: input } : input || {};
  return { id: makeId(), text: cleanText(item.text), done: Boolean(item.done) };
}

function toList(input) {
  const list = typeof input === "string" ? { name: input } : input || {};
  const name = cleanText(list.name) || EVERYONE_NAME;
  return {
    id: makeId(),
    name,
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

function checkDate(date) {
  const value = cleanText(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function createEvent(fields = {}) {
  const lists = [];
  for (const input of fields.lists || []) {
    const list = toList(input);
    const twin = lists.find((other) => norm(other.name) === norm(list.name));
    if (twin) twin.items = dedupe([...twin.items, ...list.items]);
    else lists.push(list);
  }
  const stamp = now();
  return {
    id: cleanText(fields.id) || makeId(),
    title: cleanText(fields.title) || "Mon évènement",
    emoji: cleanText(fields.emoji),
    theme: themeId(fields.theme) || DEFAULT_THEME,
    date: checkDate(fields.date),
    lists,
    createdAt: fields.createdAt || stamp,
    updatedAt: stamp,
  };
}

function edit(event, change) {
  const next = structuredClone(event);
  change(next);
  next.updatedAt = now();
  return next;
}

export function findList(event, ref) {
  if (ref && typeof ref === "object") ref = ref.id ?? ref.name;
  const key = norm(ref);
  return (
    event.lists.find((list) => list.id === ref) ||
    event.lists.find((list) => norm(list.name) === key) ||
    (isEveryone(key) ? event.lists.find(isEveryone) : undefined)
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

function requireList(event, ref) {
  const list = findList(event, ref);
  if (!list) {
    const names = event.lists.map((l) => `"${l.name}"`).join(", ") || "aucune";
    throw new Error(`Liste introuvable : "${ref}". Listes : ${names}.`);
  }
  return list;
}

function requireItem(list, ref) {
  const item = findItem(list, ref);
  if (!item)
    throw new Error(`Élément introuvable dans "${list.name}" : "${ref}".`);
  return item;
}

export function updateEvent(event, patch = {}) {
  return edit(event, (next) => {
    if ("title" in patch) next.title = cleanText(patch.title) || next.title;
    if ("emoji" in patch) next.emoji = cleanText(patch.emoji);
    if ("theme" in patch) next.theme = themeId(patch.theme) || next.theme;
    if ("date" in patch) next.date = checkDate(patch.date);
  });
}

export function addList(event, fields) {
  const list = toList(fields);
  if (findList(event, list.name)) return addItems(event, list.name, list.items);
  return edit(event, (next) => {
    if (isEveryone(list)) next.lists.unshift(list);
    else next.lists.push(list);
  });
}

export function updateList(event, ref, patch = {}) {
  return edit(event, (next) => {
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

export function removeList(event, ref) {
  return edit(event, (next) => {
    const list = requireList(next, ref);
    next.lists = next.lists.filter((other) => other.id !== list.id);
  });
}

export function moveList(event, ref, delta) {
  return edit(event, (next) => {
    const list = requireList(next, ref);
    const from = next.lists.indexOf(list);
    const to = Math.max(0, Math.min(next.lists.length - 1, from + delta));
    next.lists.splice(from, 1);
    next.lists.splice(to, 0, list);
  });
}

// Adds items to a list, creating the list when needed. Items already present
// are skipped, so repeating the same call changes nothing.
export function addItems(event, ref, items) {
  const entries = (Array.isArray(items) ? items : [items])
    .flatMap((item) => (typeof item === "string" ? splitItems(item) : [item]))
    .map(toItem)
    .filter((item) => item.text);
  return edit(event, (next) => {
    let list = findList(next, ref);
    if (!list) {
      list = toList({ name: ref });
      if (isEveryone(list)) next.lists.unshift(list);
      else next.lists.push(list);
    }
    for (const item of entries) {
      const twin = findItem(list, item.text);
      if (twin && norm(twin.text) === norm(item.text)) {
        if (item.done) twin.done = true;
      } else list.items.push(item);
    }
  });
}

export function splitItems(text) {
  return String(text)
    .split(/[,;\n]/)
    .map(cleanText)
    .filter(Boolean);
}

export function updateItem(event, listRef, itemRef, patch = {}) {
  return edit(event, (next) => {
    const item = requireItem(requireList(next, listRef), itemRef);
    if ("text" in patch && cleanText(patch.text))
      item.text = cleanText(patch.text);
    if ("done" in patch) item.done = Boolean(patch.done);
  });
}

export function toggleItem(event, listRef, itemRef) {
  const item = requireItem(requireList(event, listRef), itemRef);
  return updateItem(event, listRef, item.id, { done: !item.done });
}

export function removeItem(event, listRef, itemRef) {
  return edit(event, (next) => {
    const list = requireList(next, listRef);
    const item = requireItem(list, itemRef);
    list.items = list.items.filter((other) => other.id !== item.id);
  });
}

// Moves an item to another list (for example from "Parents" to "Tout le monde").
export function moveItem(event, listRef, itemRef, targetRef) {
  const item = requireItem(requireList(event, listRef), itemRef);
  const moved = removeItem(event, listRef, item.id);
  return addItems(moved, targetRef, [{ text: item.text, done: item.done }]);
}

export function uncheckAll(event) {
  return edit(event, (next) => {
    for (const list of next.lists)
      for (const item of list.items) item.done = false;
  });
}

export function removeDone(event) {
  return edit(event, (next) => {
    for (const list of next.lists)
      list.items = list.items.filter((item) => !item.done);
  });
}

// Adds the lists and items of a parsed text to an event. Header fields
// (title, theme…) replace the current ones only when the text has them.
export function mergeInto(event, parsed) {
  let next = event;
  const patch = {};
  for (const key of ["title", "emoji", "theme", "date"]) {
    if (parsed[key]) patch[key] = parsed[key];
  }
  if (Object.keys(patch).length) next = updateEvent(next, patch);
  for (const list of parsed.lists || []) {
    next = addList(next, { name: list.name, emoji: list.emoji });
    if (list.emoji) next = updateList(next, list.name, { emoji: list.emoji });
    next = addItems(next, list.name, list.items || []);
  }
  return next;
}

export function progress(target) {
  const lists = target.lists || [target];
  let done = 0;
  let total = 0;
  for (const list of lists) {
    total += list.items.length;
    done += list.items.filter((item) => item.done).length;
  }
  return { done, total };
}

// Lists shown first: the shared one, then people in their own order.
export function sortedLists(event) {
  return [
    ...event.lists.filter(isEveryone),
    ...event.lists.filter((l) => !isEveryone(l)),
  ];
}
