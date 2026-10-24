import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PDFDocument } from "pdf-lib";
import { buildPdf, pdfFileName } from "../lib/pdf.js";
import { docFromText } from "../lib/format.js";
import { updateDoc } from "../lib/model.js";
import { EXAMPLES } from "../lib/examples.js";

const fonts = {
  title: fs.readFileSync("public/fonts/Fredoka-SemiBold.ttf"),
  body: fs.readFileSync("public/fonts/Nunito-Regular.ttf"),
};
const assets = { fonts, emoji: async () => null };
const pages = async (doc) =>
  (await PDFDocument.load(await buildPdf(doc, assets))).getPageCount();

test("every example fits its layout", async () => {
  for (const example of EXAMPLES) {
    const doc = docFromText(example.text);
    const expected = doc.pdf.layout === "chacun" ? doc.lists.length : 1;
    assert.equal(await pages(doc), expected, example.slug);
  }
});

test("both layouts give an overview plus one page per list", async () => {
  const doc = updateDoc(docFromText(EXAMPLES[0].text), {
    pdf: { layout: "les-deux" },
  });
  assert.equal(await pages(doc), 1 + doc.lists.length);
});

test("a very long list flows onto more pages", async () => {
  const items = Array.from(
    { length: 160 },
    (_, i) => `Élément numéro ${i + 1}`,
  ).join(", ");
  assert.ok((await pages(docFromText(`# Longue\nA : ${items}\nB : x`))) > 1);
});

test("an empty document still gives a page", async () => {
  assert.equal(await pages(docFromText("# Vide")), 1);
});

test("file names are plain", () => {
  assert.equal(
    pdfFileName({ title: "Week-end chez Mamie !" }),
    "week-end-chez-mamie.pdf",
  );
});
