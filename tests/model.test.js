import test from "node:test";
import assert from "node:assert/strict";
import * as m from "../lib/model.js";
import { parseText } from "../lib/format.js";
import { getTheme } from "../lib/themes.js";

const base = () =>
  m.createDoc({
    title: "Week-end",
    lists: [
      { name: "Parents", items: ["Lit bébé", "tapis"] },
      { name: "Lily" },
    ],
  });
const texts = (doc, list) => m.findList(doc, list).items.map((i) => i.text);

test("creates a document with defaults", () => {
  const doc = m.createDoc();
  assert.equal(doc.title, "Ma liste");
  assert.equal(doc.theme, "fete");
  assert.deepEqual(doc.pdf, m.DEFAULT_PDF);
});

test("PDF settings are kept within bounds", () => {
  const doc = m.updateDoc(base(), {
    pdf: { layout: "nope", blankLines: 99, orientation: "paysage" },
  });
  assert.deepEqual(doc.pdf, {
    layout: "une",
    orientation: "paysage",
    blankLines: 10,
    freeLines: 0,
    boxes: "carrees",
  });
});

test("adding items is idempotent and creates missing lists", () => {
  let doc = m.addItems(base(), "lily", "doudou, pyjama");
  doc = m.addItems(doc, "Lily", ["Doudou"]);
  doc = m.addItems(doc, "Achille", "sac");
  assert.deepEqual(texts(doc, "Lily"), ["doudou", "pyjama"]);
  assert.deepEqual(texts(doc, "achille"), ["sac"]);
});

test("items are edited, moved and removed by text", () => {
  let doc = m.updateItem(base(), "parents", "lit bebe", "Lit parapluie");
  doc = m.moveItem(doc, "Parents", "tap", -1);
  assert.deepEqual(texts(doc, "Parents"), ["tapis", "Lit parapluie"]);
  doc = m.removeItem(doc, "Parents", "tapis");
  assert.deepEqual(texts(doc, "Parents"), ["Lit parapluie"]);
});

test("functions never change their input", () => {
  const doc = base();
  const copy = structuredClone(doc);
  m.addItems(doc, "Parents", "couches");
  m.moveList(doc, "Lily", -1);
  assert.deepEqual(doc, copy);
});

test("errors name the available lists", () => {
  assert.throws(() => m.removeItem(base(), "Mamie", "x"), /Parents.*Lily/);
  assert.throws(() => m.removeItem(base(), "Lily", "x"), /introuvable/);
  assert.throws(
    () => m.updateList(base(), "Lily", { name: "parents" }),
    /existe déjà/,
  );
});

test("the shared list comes first and uses the accent color", () => {
  let doc = m.addList(base(), { name: "Tout le monde", items: ["jeux"] });
  assert.equal(m.sortedLists(doc)[0].name, "Tout le monde");
  doc = m.moveItemTo(doc, "Parents", "tapis", "tous");
  assert.deepEqual(texts(doc, "Tout le monde"), ["jeux", "tapis"]);
  const theme = getTheme("voyage");
  const colors = m.listColors(doc, theme);
  assert.equal(colors.get(m.findList(doc, "tous").id), theme.accent);
  assert.equal(colors.get(m.findList(doc, "Parents").id), theme.people[0]);
});

test("merging a text adds to existing lists", () => {
  const doc = m.mergeInto(
    base(),
    parseText("@theme plage\nLily 🐰 : maillot\nPapi : canne"),
  );
  assert.equal(doc.theme, "plage");
  assert.equal(doc.title, "Week-end");
  assert.equal(m.findList(doc, "Lily").emoji, "🐰");
  assert.equal(doc.lists.length, 3);
});
