// window.todos: a small API for AI agents that drive the browser (Claude in
// Chrome, browser-use…). Each method returns plain JSON-friendly data and
// throws an Error with a French message when something is not found.
import * as model from "./model.js";
import { parseText, eventFromText, eventToText } from "./format.js";
import { eventIdFromUrl, shareUrl } from "./link.js";
import { THEMES } from "./themes.js";
import * as store from "./store.js";

export const AGENT_HELP = `window.todos — piloter les listes de cette page.
Chaque méthode prend d'abord l'évènement (id ou titre) ; null = l'évènement ouvert.
Listes et éléments se désignent par leur nom ou texte (sans tenir compte des
majuscules ni des accents ; un début de texte suffit pour un élément).

  todos.list()                                → [{ id, title, done, total }]
  todos.get(ev)                               → évènement complet
  todos.current()                             → id de l'évènement ouvert ou null
  todos.create(texteOuChamps)                 → crée et ouvre, renvoie l'id
       ex. todos.create("# 🧳 Week-end\\n@theme voyage\\nParents : lit bébé, tapis\\nLily 🐰 : doudou")
       ou  todos.create({ title, emoji, theme, date: "AAAA-MM-JJ", lists: [{ name, emoji, items: ["…"] }] })
  todos.open(ev) / todos.home()
  todos.update(ev, { title, emoji, theme, date })
  todos.addText(ev, texte)                    → ajoute listes et éléments écrits au format texte
  todos.addList(ev, nom, { emoji })           ("Tout le monde" = liste commune)
  todos.renameList(ev, liste, nouveauNom) / todos.setListEmoji(ev, liste, emoji)
  todos.removeList(ev, liste)
  todos.addItems(ev, liste, ["…", "…"])       → crée la liste si besoin, ignore les doublons
  todos.check(ev, liste, element, fait = true)
  todos.editItem(ev, liste, element, nouveauTexte)
  todos.removeItem(ev, liste, element)
  todos.moveItem(ev, liste, element, autreListe)
  todos.uncheckAll(ev)
  todos.remove(ev)                            → supprime l'évènement
  todos.toText(ev) / todos.shareUrl(ev)       → texte ou lien de partage
  todos.themes                                → ${THEMES.map((t) => t.id).join(", ")}

Format texte complet : voir /llms.txt`;

function resolve(ref) {
  const events = store.getEvents();
  if (ref == null || ref === "") {
    const id = eventIdFromUrl(window.location.href);
    const open = id && store.getEvent(id);
    if (!open)
      throw new Error("Aucun évènement ouvert : passez son id ou son titre.");
    return open.id;
  }
  const key = model.norm(ref);
  const event =
    events.find((e) => e.id === ref) ||
    events.find((e) => model.norm(e.title) === key) ||
    events.find((e) => model.norm(e.title).startsWith(key));
  if (!event) {
    const titles =
      events.map((e) => `"${e.title}" (${e.id})`).join(", ") || "aucun";
    throw new Error(
      `Évènement introuvable : "${ref}". Évènements : ${titles}.`,
    );
  }
  return event.id;
}

function summary(event) {
  return { id: event.id, title: event.title, ...model.progress(event) };
}

function apply(ref, fn, ...args) {
  return structuredClone(store.change(resolve(ref), fn, ...args));
}

function baseUrl() {
  return window.location.href.split("#")[0].split("?")[0];
}

function openEvent(id) {
  window.location.hash = `/${id}`;
  return id;
}

export function installAgentApi() {
  const api = {
    help() {
      console.log(AGENT_HELP);
      return AGENT_HELP;
    },
    themes: THEMES.map((theme) => theme.id),
    list: () => store.getEvents().map(summary),
    get: (ref) => structuredClone(store.getEvent(resolve(ref))),
    current() {
      const id = eventIdFromUrl(window.location.href);
      return id && store.getEvent(id) ? id : null;
    },
    create(input = {}) {
      const event =
        typeof input === "string"
          ? eventFromText(input)
          : model.createEvent(input);
      if (store.getEvent(event.id)) event.id = model.makeId();
      store.saveEvent(event);
      return openEvent(event.id);
    },
    open: (ref) => openEvent(resolve(ref)),
    home() {
      window.location.hash = "";
      return true;
    },
    update: (ref, patch) => apply(ref, model.updateEvent, patch),
    addText: (ref, text) => apply(ref, model.mergeInto, parseText(text)),
    addList: (ref, name, options = {}) =>
      apply(ref, model.addList, { name, ...options }),
    renameList: (ref, list, name) =>
      apply(ref, model.updateList, list, { name }),
    setListEmoji: (ref, list, emoji) =>
      apply(ref, model.updateList, list, { emoji }),
    removeList: (ref, list) => apply(ref, model.removeList, list),
    addItems: (ref, list, items) => apply(ref, model.addItems, list, items),
    check: (ref, list, item, done = true) =>
      apply(ref, model.updateItem, list, item, { done }),
    editItem: (ref, list, item, text) =>
      apply(ref, model.updateItem, list, item, { text }),
    removeItem: (ref, list, item) => apply(ref, model.removeItem, list, item),
    moveItem: (ref, list, item, target) =>
      apply(ref, model.moveItem, list, item, target),
    uncheckAll: (ref) => apply(ref, model.uncheckAll),
    remove(ref) {
      const id = resolve(ref);
      store.deleteEvent(id);
      if (eventIdFromUrl(window.location.href) === id)
        window.location.hash = "";
      return true;
    },
    toText: (ref) => eventToText(store.getEvent(resolve(ref))),
    shareUrl: (ref) => shareUrl(store.getEvent(resolve(ref)), baseUrl()),
  };
  window.todos = api;
  return api;
}
