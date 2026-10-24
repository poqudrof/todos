import test from "node:test";
import assert from "node:assert/strict";
import {
  parseText,
  docFromText,
  docToText,
  splitEmoji,
} from "../lib/format.js";
import { textFromUrl, shareUrl, docIdFromUrl } from "../lib/link.js";

const names = (parsed) => parsed.lists.map((list) => list.name);

test("parses the one-line example", () => {
  const parsed = parseText(
    "Parents :   Lit bébé, tapis, habits, couches, trousse toilettes,  Achille :  Sac avec doudou, Lily : sac avec doudou, Enfants : 3 jeux de société et 4 livres chacun.",
  );
  assert.deepEqual(names(parsed), ["Parents", "Achille", "Lily", "Enfants"]);
  assert.deepEqual(parsed.lists[0].items, [
    "Lit bébé",
    "tapis",
    "habits",
    "couches",
    "trousse toilettes",
  ]);
  assert.deepEqual(parsed.lists[3].items, [
    "3 jeux de société et 4 livres chacun",
  ]);
});

test("parses title, subtitle, PDF settings, bullets and emojis", () => {
  const parsed = parseText(`# 🧳 Week-end chez Mamie
## Ce qu'on emporte
@theme vacances
@pages chacun
@orientation paysage
@lignes 3
@cases rondes

Achille 🦁 :
- Sac avec doudou
- [ ] Pyjama
1. Bottes
Tout le monde : pique-nique`);
  assert.equal(parsed.title, "Week-end chez Mamie");
  assert.equal(parsed.emoji, "🧳");
  assert.equal(parsed.subtitle, "Ce qu'on emporte");
  assert.equal(parsed.theme, "voyage");
  assert.deepEqual(parsed.pdf, {
    layout: "chacun",
    orientation: "paysage",
    blankLines: 3,
    boxes: "rondes",
  });
  assert.deepEqual(parsed.lists[0], {
    name: "Achille",
    emoji: "🦁",
    items: ["Sac avec doudou", "Pyjama", "Bottes"],
  });
  assert.equal(parsed.lists[1].name, "Tout le monde");
});

test("labels like Titre or Thème fill the header", () => {
  const parsed = parseText(
    "Titre : Anniversaire de Lily 🎂, Thème : fête, Lily : gâteau",
  );
  assert.equal(parsed.title, "Anniversaire de Lily");
  assert.equal(parsed.emoji, "🎂");
  assert.equal(parsed.theme, "fete");
  assert.deepEqual(names(parsed), ["Lily"]);
});

test("items without a label go to everyone, times are not labels", () => {
  const parsed = parseText("Gâteau, bougies\nRDV 10:30, http://exemple.fr");
  assert.deepEqual(names(parsed), ["Tout le monde"]);
  assert.deepEqual(parsed.lists[0].items, [
    "Gâteau",
    "bougies",
    "RDV 10:30",
    "http://exemple.fr",
  ]);
});

test("splits an emoji from a name", () => {
  assert.deepEqual(splitEmoji("👨‍👩‍👧 Parents"), { name: "Parents", emoji: "👨‍👩‍👧" });
  assert.deepEqual(splitEmoji("Lily 🐰"), { name: "Lily", emoji: "🐰" });
  assert.deepEqual(splitEmoji("3 livres"), { name: "3 livres", emoji: "" });
});

test("text round trip keeps everything", () => {
  const doc = docFromText(
    "# 🎄 Noël\n## Chez Papi\n@theme noel\n@pages les-deux\n@lignes 2\nTous : sapin\nAchille 🦁 : luge, gants",
  );
  const again = docFromText(docToText(doc));
  assert.equal(again.id, doc.id);
  assert.equal(again.subtitle, "Chez Papi");
  assert.equal(again.theme, "hiver");
  assert.deepEqual(again.pdf, doc.pdf);
  assert.deepEqual(
    again.lists.map((l) => [l.name, l.emoji, l.items.map((i) => i.text)]),
    [
      ["Tous", "", ["sapin"]],
      ["Achille", "🦁", ["luge", "gants"]],
    ],
  );
});

test("links carry the text in the hash or the query", () => {
  const doc = docFromText("# Fête\nLily : ballons, gâteau");
  const url = shareUrl(doc, "https://todos.example/");
  assert.ok(url.startsWith("https://todos.example/#liste="));
  assert.equal(textFromUrl(url), docToText(doc));
  assert.equal(
    textFromUrl("https://x/?liste=Lily+%3A+doudou"),
    "Lily : doudou",
  );
  assert.equal(textFromUrl("https://x/#list=Lily : doudou"), "Lily : doudou");
  assert.equal(textFromUrl("https://x/#/abc"), null);
  assert.equal(docIdFromUrl("https://x/#/abc123"), "abc123");
});
