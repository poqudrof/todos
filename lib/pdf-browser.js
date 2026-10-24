// Builds the PDF in the browser: fonts come from /fonts, emojis are drawn
// with the system emoji font on a canvas. pdf-lib is loaded on first use.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
let fontsPromise = null;
const emojiCache = new Map();

function loadFonts() {
  fontsPromise ??= Promise.all(
    ["Fredoka-SemiBold", "Nunito-Regular"].map((name) =>
      fetch(`${base}/fonts/${name}.ttf`).then((r) => {
        if (!r.ok) throw new Error(`Police introuvable : ${name}`);
        return r.arrayBuffer();
      }),
    ),
  ).then(([title, body]) => ({ title, body }));
  fontsPromise.catch(() => (fontsPromise = null));
  return fontsPromise;
}

function drawEmoji(text) {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  c.font = `${size * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, size / 2, size * 0.55);
  const pixels = c.getImageData(0, 0, size, size).data;
  let ink = 0;
  for (let i = 3; i < pixels.length; i += 16) ink += pixels[i];
  if (!ink) return Promise.resolve(null);
  return new Promise((resolve) =>
    canvas.toBlob(
      async (blob) =>
        resolve(blob ? new Uint8Array(await blob.arrayBuffer()) : null),
      "image/png",
    ),
  );
}

function emoji(text) {
  if (!emojiCache.has(text)) emojiCache.set(text, drawEmoji(text));
  return emojiCache.get(text);
}

export async function makePdf(doc) {
  const [{ buildPdf }, fonts] = await Promise.all([
    import("./pdf.js"),
    loadFonts(),
  ]);
  const bytes = await buildPdf(doc, { fonts, emoji });
  return new Blob([bytes], { type: "application/pdf" });
}

export async function downloadPdf(doc) {
  const [{ pdfFileName }, blob] = await Promise.all([
    import("./pdf.js"),
    makePdf(doc),
  ]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFileName(doc);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
