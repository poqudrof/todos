// JSON backup of the documents: to keep a copy, or to move them to another
// browser. Importing accepts a backup, a single document or a list of them.
import { createDoc } from "./model.js";

export function backupJson(docs) {
  const backup = {
    app: "todos",
    version: 1,
    exportedAt: new Date().toISOString(),
    docs,
  };
  return JSON.stringify(backup, null, 2);
}

export function docsFromJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n’est pas un JSON valide.");
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.docs)
      ? data.docs
      : [data];
  const docs = list
    .filter((doc) => doc && typeof doc === "object" && Array.isArray(doc.lists))
    .map((doc) => createDoc(doc));
  if (!docs.length) throw new Error("Aucune liste trouvée dans ce fichier.");
  return docs;
}

export function backupFileName(date = new Date()) {
  return `todos-${date.toISOString().slice(0, 10)}.json`;
}
