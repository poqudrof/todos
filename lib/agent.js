// window.todos: a small scripting API for automation tools that drive the
// browser. Nothing in the page shows it. Methods return JSON-friendly data
// and throw an Error with a French message when something is not found.
import * as model from "./model.js";
import { parseText, docFromText, docToText } from "./format.js";
import { docIdFromUrl, shareUrl } from "./link.js";
import { THEMES } from "./themes.js";
import * as store from "./store.js";

const HELP = `window.todos — le premier argument est le document (id ou titre ; null = celui qui est ouvert).
  list() · get(doc) · current() · open(doc) · home()
  create(texte | { title, subtitle, emoji, theme, pdf, lists: [{ name, emoji, items }] }) → id
  update(doc, { title, subtitle, emoji, theme, pdf: { layout: une|chacun|les-deux, orientation: portrait|paysage, blankLines, boxes: carrees|rondes } })
  addText(doc, texte) · addList(doc, nom, { emoji }) · renameList(doc, liste, nom) · setListEmoji(doc, liste, emoji) · removeList(doc, liste)
  addItems(doc, liste, ["…"]) · editItem(doc, liste, element, texte) · removeItem(doc, liste, element) · moveItemTo(doc, liste, element, autreListe)
  remove(doc) · toText(doc) · shareUrl(doc) · pdf(doc) (télécharge le PDF)
  thèmes : ${THEMES.map((t) => t.id).join(", ")}`;

function resolve(ref) {
  const docs = store.getDocs();
  if (ref == null || ref === "") {
    const id = docIdFromUrl(window.location.href);
    if (!id || !store.getDoc(id))
      throw new Error("Aucun document ouvert : passez son id ou son titre.");
    return id;
  }
  const key = model.norm(ref);
  const doc =
    docs.find((d) => d.id === ref) ||
    docs.find((d) => model.norm(d.title) === key) ||
    docs.find((d) => model.norm(d.title).startsWith(key));
  if (!doc) {
    const titles =
      docs.map((d) => `"${d.title}" (${d.id})`).join(", ") || "aucun";
    throw new Error(`Document introuvable : "${ref}". Documents : ${titles}.`);
  }
  return doc.id;
}

const apply = (ref, fn, ...args) =>
  structuredClone(store.change(resolve(ref), fn, ...args));
const openDoc = (id) => {
  window.location.hash = `/${id}`;
  return id;
};

export function installAgentApi() {
  window.todos = {
    help: () => HELP,
    list: () =>
      store.getDocs().map((d) => ({
        id: d.id,
        title: d.title,
        lists: d.lists.length,
        items: model.countItems(d),
      })),
    get: (ref) => structuredClone(store.getDoc(resolve(ref))),
    current() {
      const id = docIdFromUrl(window.location.href);
      return id && store.getDoc(id) ? id : null;
    },
    create(input = {}) {
      const doc =
        typeof input === "string" ? docFromText(input) : model.createDoc(input);
      if (store.getDoc(doc.id)) doc.id = model.makeId();
      store.saveDoc(doc);
      return openDoc(doc.id);
    },
    open: (ref) => openDoc(resolve(ref)),
    home() {
      window.location.hash = "";
      return true;
    },
    update: (ref, patch) => apply(ref, model.updateDoc, patch),
    addText: (ref, text) => apply(ref, model.mergeInto, parseText(text)),
    addList: (ref, name, options = {}) =>
      apply(ref, model.addList, { name, ...options }),
    renameList: (ref, list, name) =>
      apply(ref, model.updateList, list, { name }),
    setListEmoji: (ref, list, emoji) =>
      apply(ref, model.updateList, list, { emoji }),
    removeList: (ref, list) => apply(ref, model.removeList, list),
    addItems: (ref, list, items) => apply(ref, model.addItems, list, items),
    editItem: (ref, list, item, text) =>
      apply(ref, model.updateItem, list, item, text),
    removeItem: (ref, list, item) => apply(ref, model.removeItem, list, item),
    moveItemTo: (ref, list, item, target) =>
      apply(ref, model.moveItemTo, list, item, target),
    remove(ref) {
      const id = resolve(ref);
      store.deleteDoc(id);
      if (docIdFromUrl(window.location.href) === id) window.location.hash = "";
      return true;
    },
    toText: (ref) => docToText(store.getDoc(resolve(ref))),
    shareUrl: (ref) =>
      shareUrl(
        store.getDoc(resolve(ref)),
        window.location.href.split("#")[0].split("?")[0],
      ),
    async pdf(ref) {
      const { downloadPdf } = await import("./pdf-browser.js");
      await downloadPdf(store.getDoc(resolve(ref)));
      return true;
    },
  };
}
