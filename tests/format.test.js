import test from "node:test";
import assert from "node:assert/strict";
import {
  parseText,
  eventFromText,
  eventToText,
  splitEmoji,
} from "../lib/format.js";
import { textFromUrl, shareUrl, eventIdFromUrl } from "../lib/link.js";

const names = (parsed) => parsed.lists.map((list) => list.name);
const texts = (list) => list.items.map((item) => item.text);

test("parses the one-line example", () => {
  const parsed = parseText(
    "Parents :   Lit bébé, tapis, habits, couches, trousse toilettes,  Achille :  Sac avec doudou, Lily : sac avec doudou, Enfants : 3 jeux de société et 4 livres chacun.",
  );
  assert.deepEqual(names(parsed), ["Parents", "Achille", "Lily", "Enfants"]);
  assert.deepEqual(texts(parsed.lists[0]), [
    "Lit bébé",
    "tapis",
    "habits",
    "couches",
    "trousse toilettes",
  ]);
  assert.deepEqual(texts(parsed.lists[1]), ["Sac avec doudou"]);
  assert.deepEqual(texts(parsed.lists[3]), [
    "3 jeux de société et 4 livres chacun",
  ]);
});

test("parses headers, bullets, check boxes and emojis", () => {
  const parsed = parseText(`# 🧳 Week-end chez Mamie
@theme vacances
@date 14/11/2026

Achille 🦁 :
- Sac avec doudou
- [x] Pyjama
1. Bottes

Tout le monde : pique-nique`);
  assert.equal(parsed.title, "Week-end chez Mamie");
  assert.equal(parsed.emoji, "🧳");
  assert.equal(parsed.theme, "voyage");
  assert.equal(parsed.date, "2026-11-14");
  assert.deepEqual(parsed.lists[0], {
    name: "Achille",
    emoji: "🦁",
    items: [
      { text: "Sac avec doudou", done: false },
      { text: "Pyjama", done: true },
      { text: "Bottes", done: false },
    ],
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
  assert.deepEqual(texts(parsed.lists[0]), [
    "Gâteau",
    "bougies",
    "RDV 10:30",
    "http://exemple.fr",
  ]);
});

test("a list named twice is merged", () => {
  const parsed = parseText("Lily : doudou\nLily : pyjama");
  assert.equal(parsed.lists.length, 1);
  assert.deepEqual(texts(parsed.lists[0]), ["doudou", "pyjama"]);
});

test("splits an emoji from a name", () => {
  assert.deepEqual(splitEmoji("👨‍👩‍👧 Parents"), { name: "Parents", emoji: "👨‍👩‍👧" });
  assert.deepEqual(splitEmoji("Lily 🐰"), { name: "Lily", emoji: "🐰" });
  assert.deepEqual(splitEmoji("3 livres"), { name: "3 livres", emoji: "" });
});

test("text round trip keeps everything", () => {
  const event = eventFromText(
    "# 🎄 Noël\n@theme noel\nTous : sapin\nAchille 🦁 : [x] luge, gants",
  );
  const again = eventFromText(eventToText(event));
  assert.equal(again.id, event.id);
  assert.equal(again.title, "Noël");
  assert.equal(again.theme, "hiver");
  assert.deepEqual(
    again.lists.map((l) => [
      l.name,
      l.emoji,
      l.items.map((i) => [i.text, i.done]),
    ]),
    [
      ["Tous", "", [["sapin", false]]],
      [
        "Achille",
        "🦁",
        [
          ["luge", true],
          ["gants", false],
        ],
      ],
    ],
  );
});

test("links carry the text in the hash or the query", () => {
  const event = eventFromText("# Fête\nLily : ballons, gâteau");
  const url = shareUrl(event, "https://todos.example/");
  assert.ok(url.startsWith("https://todos.example/#liste="));
  assert.equal(textFromUrl(url), eventToText(event));
  assert.equal(
    textFromUrl("https://x/?liste=Lily+%3A+doudou"),
    "Lily : doudou",
  );
  assert.equal(textFromUrl("https://x/#list=Lily : doudou"), "Lily : doudou");
  assert.equal(textFromUrl("https://x/#/abc"), null);
  assert.equal(eventIdFromUrl("https://x/#/abc123"), "abc123");
});
