// Makes PDFs without a browser.
//   npm run pdf -- ma-liste.txt [-o ma-liste.pdf]   one document in the text format
//   npm run exemples                                every example, with a PNG
//                                                   thumbnail, into public/exemples/
// Emojis are drawn with the system emoji font through sharp (Apple Color
// Emoji on macOS); where it is missing they are left out.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPdf, pdfFileName } from "../lib/pdf.js";
import { docFromText } from "../lib/format.js";
import { EXAMPLES } from "../lib/examples.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const font = (name) => fs.readFileSync(path.join(root, "public/fonts", name));
const fonts = {
  title: font("Fredoka-SemiBold.ttf"),
  body: font("Nunito-Regular.ttf"),
};

let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("sharp absent : PDF sans emojis.");
}

async function emoji(text) {
  if (!sharp) return null;
  const png = await sharp({
    text: { text, font: "Apple Color Emoji", dpi: 600, rgba: true },
  })
    .png()
    .toBuffer();
  // Centered on a square so every emoji has the same footprint.
  const { width, height } = await sharp(png).metadata();
  const side = Math.max(width, height);
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: png,
        left: Math.round((side - width) / 2),
        top: Math.round((side - height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function write(doc, file) {
  const bytes = await buildPdf(doc, { fonts, emoji });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  console.log(`${file} (${Math.round(bytes.length / 1024)} Ko)`);
}

// First page as a small PNG, with Ghostscript when it is installed.
async function thumbnail(file) {
  const png = file.replace(/\.pdf$/, ".png");
  try {
    execFileSync("gs", [
      "-q",
      "-dSAFER",
      "-sDEVICE=png16m",
      "-r110",
      "-dFirstPage=1",
      "-dLastPage=1",
      "-dTextAlphaBits=4",
      "-dGraphicsAlphaBits=4",
      "-o",
      png,
      file,
    ]);
    if (sharp) {
      const small = await sharp(png)
        .resize({ width: 520 })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
      fs.writeFileSync(png, small);
    }
  } catch {
    console.warn(
      "Ghostscript absent : pas de miniature pour",
      path.basename(file),
    );
  }
}

const args = process.argv.slice(2);
if (args.includes("--exemples")) {
  const dir = path.join(root, "public/exemples");
  for (const example of EXAMPLES) {
    const file = path.join(dir, `${example.slug}.pdf`);
    await write(docFromText(example.text), file);
    await thumbnail(file);
  }
} else if (args[0]) {
  const doc = docFromText(fs.readFileSync(args[0], "utf8"));
  const out = args.includes("-o")
    ? args[args.indexOf("-o") + 1]
    : pdfFileName(doc);
  await write(doc, out);
} else {
  console.log("Usage : npm run pdf -- liste.txt [-o sortie.pdf] | --exemples");
}
