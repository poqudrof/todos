import test from "node:test";
import assert from "node:assert/strict";
import { backupJson, docsFromJson, backupFileName } from "../lib/backup.js";
import { docFromText } from "../lib/format.js";
import { docFileName } from "../lib/download.js";

const doc = docFromText(
  "# 🧳 Week-end\n@theme voyage\n@pages chacun\nLily 🐰 : doudou, pyjama",
);
const shape = (d) => [
  d.id,
  d.title,
  d.emoji,
  d.theme,
  d.pdf,
  d.lists.map((l) => [l.name, l.emoji, l.items.map((i) => i.text)]),
];

test("a backup comes back identical", () => {
  const [back] = docsFromJson(backupJson([doc]));
  assert.deepEqual(shape(back), shape(doc));
  assert.equal(back.createdAt, doc.createdAt);
});

test("a single document or a plain array can be imported", () => {
  assert.equal(docsFromJson(JSON.stringify(doc))[0].title, "Week-end");
  assert.equal(docsFromJson(JSON.stringify([doc, doc])).length, 2);
});

test("broken or unrelated files are refused with a clear message", () => {
  assert.throws(() => docsFromJson("{oops"), /JSON valide/);
  assert.throws(() => docsFromJson('{"hello": 1}'), /Aucune liste/);
});

test("file names", () => {
  assert.equal(
    backupFileName(new Date("2026-10-24T10:00:00Z")),
    "todos-2026-10-24.json",
  );
  assert.equal(
    docFileName({ title: "Week-end chez Mamie !" }, "json"),
    "week-end-chez-mamie.json",
  );
});
