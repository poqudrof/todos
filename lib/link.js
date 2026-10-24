// Links carry a whole document in the address, after "#", so nothing is
// sent to a server: "https://…/#liste=Parents%20%3A%20Lit%20b%C3%A9b%C3%A9".
import { docToText } from "./format.js";

const KEYS = ["liste", "list", "todo", "todos", "texte", "text"];

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Returns the list text found in an address (hash first, then query), or null.
export function textFromUrl(href) {
  let url;
  try {
    url = new URL(href, "https://local.invalid/");
  } catch {
    return null;
  }
  const hash = url.hash.replace(/^#/, "");
  for (const key of KEYS) {
    const prefix = `${key}=`;
    if (hash.startsWith(prefix)) return decode(hash.slice(prefix.length));
  }
  for (const key of KEYS) {
    const value = url.searchParams.get(key);
    if (value) return value;
  }
  return null;
}

// Document pages live at "#/<id>".
export function docIdFromUrl(href) {
  const hash = String(href).split("#")[1] || "";
  const match = hash.match(/^\/([\w-]+)/);
  return match ? match[1] : null;
}

export function shareUrl(doc, base) {
  return `${base}#liste=${encodeURIComponent(docToText(doc))}`;
}
