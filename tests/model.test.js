import test from "node:test";
import assert from "node:assert/strict";
import {
  createEvent,
  addItems,
  addList,
  toggleItem,
  removeItem,
  moveItem,
  updateList,
  uncheckAll,
  mergeInto,
  progress,
  sortedLists,
  findList,
} from "../lib/model.js";
import { parseText } from "../lib/format.js";

const base = () =>
  createEvent({
    title: "Week-end",
    lists: [
      { name: "Parents", items: ["Lit bébé", "tapis"] },
      { name: "Lily" },
    ],
  });

test("creates an event with defaults", () => {
  const event = createEvent();
  assert.equal(event.title, "Mon évènement");
  assert.equal(event.theme, "fete");
  assert.deepEqual(event.lists, []);
});

test("adding items is idempotent and creates missing lists", () => {
  let event = addItems(base(), "lily", "doudou, pyjama");
  event = addItems(event, "Lily", ["Doudou"]);
  event = addItems(event, "Achille", "sac");
  assert.deepEqual(
    findList(event, "Lily").items.map((i) => i.text),
    ["doudou", "pyjama"],
  );
  assert.equal(findList(event, "achille").items.length, 1);
});

test("items are found by text, accent-insensitive, or by prefix", () => {
  let event = toggleItem(base(), "parents", "lit bebe");
  assert.equal(progress(event).done, 1);
  event = toggleItem(event, "Parents", "tap");
  assert.deepEqual(progress(event), { done: 2, total: 2 });
  event = uncheckAll(event);
  assert.equal(progress(event).done, 0);
  event = removeItem(event, "Parents", "tapis");
  assert.equal(progress(event).total, 1);
});

test("functions never change their input", () => {
  const event = base();
  const copy = structuredClone(event);
  addItems(event, "Parents", "couches");
  toggleItem(event, "Parents", "tapis");
  assert.deepEqual(event, copy);
});

test("errors name the available lists", () => {
  assert.throws(() => toggleItem(base(), "Mamie", "x"), /Parents.*Lily/);
  assert.throws(() => toggleItem(base(), "Lily", "x"), /introuvable/);
  assert.throws(
    () => updateList(base(), "Lily", { name: "parents" }),
    /existe déjà/,
  );
});

test("the shared list comes first", () => {
  let event = addList(base(), { name: "Tout le monde", items: ["jeux"] });
  assert.equal(sortedLists(event)[0].name, "Tout le monde");
  assert.equal(findList(event, "tous").name, "Tout le monde");
  event = moveItem(event, "Parents", "tapis", "Tout le monde");
  assert.deepEqual(
    findList(event, "Tout le monde").items.map((i) => i.text),
    ["jeux", "tapis"],
  );
});

test("merging a text adds to existing lists", () => {
  const event = mergeInto(
    base(),
    parseText("@theme plage\nLily 🐰 : maillot\nPapi : canne"),
  );
  assert.equal(event.theme, "plage");
  assert.equal(event.title, "Week-end");
  assert.equal(findList(event, "Lily").emoji, "🐰");
  assert.equal(findList(event, "Lily").items[0].text, "maillot");
  assert.equal(event.lists.length, 3);
});
