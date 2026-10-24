// Documents are kept in this browser only (localStorage). The page and the
// agent API both go through this store, so a change from either side shows
// up at once, also in other tabs.

const KEY = "todos:v2";
const EMPTY = { docs: [] };

let state = EMPTY;
let loaded = false;
const listeners = new Set();

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.docs)) return saved;
  } catch {
    // Private windows or blocked storage: start empty.
  }
  return { docs: [] };
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

export function getDocs() {
  return getSnapshot().docs;
}

export function getDoc(id) {
  return getDocs().find((doc) => doc.id === id) || null;
}

function commit(docs) {
  state = { docs };
  write();
  emit();
}

// Saves a document, newest first. Returns it.
export function saveDoc(doc) {
  const others = getDocs().filter((other) => other.id !== doc.id);
  commit([doc, ...others]);
  return doc;
}

// Runs a model function on a stored document and saves the result.
export function change(id, fn, ...args) {
  const doc = getDoc(id);
  if (!doc) throw new Error(`Document introuvable : "${id}".`);
  const next = fn(doc, ...args);
  commit(getDocs().map((other) => (other.id === id ? next : other)));
  return next;
}

export function deleteDoc(id) {
  const doc = getDoc(id);
  commit(getDocs().filter((other) => other.id !== id));
  return doc;
}
