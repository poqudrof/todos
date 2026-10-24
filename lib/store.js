// Events are kept in this browser only (localStorage). The page and the
// agent API both go through this store, so a change from either side shows
// up at once, also in other tabs.
import { createEvent } from "./model.js";

const KEY = "todos:v1";
const EMPTY = { events: [] };

let state = EMPTY;
let loaded = false;
const listeners = new Set();

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.events)) return saved;
  } catch {
    // Private windows or blocked storage: start empty.
  }
  return { events: [] };
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the page keeps working for this visit.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    state = read();
    emit();
  });
}

export function subscribe(listener) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  ensureLoaded();
  return state;
}

export function getServerSnapshot() {
  return EMPTY;
}

export function getEvents() {
  return getSnapshot().events;
}

export function getEvent(id) {
  return getEvents().find((event) => event.id === id) || null;
}

function commit(events) {
  state = { events };
  write();
  emit();
}

// Saves an event, newest first. Returns it.
export function saveEvent(event) {
  const others = getEvents().filter((other) => other.id !== event.id);
  commit([event, ...others]);
  return event;
}

export function createAndSave(fields) {
  return saveEvent(createEvent(fields));
}

// Runs a model function on a stored event and saves the result.
export function change(id, fn, ...args) {
  const event = getEvent(id);
  if (!event) throw new Error(`Évènement introuvable : "${id}".`);
  const next = fn(event, ...args);
  commit(getEvents().map((other) => (other.id === id ? next : other)));
  return next;
}

export function deleteEvent(id) {
  const event = getEvent(id);
  commit(getEvents().filter((other) => other.id !== id));
  return event;
}
