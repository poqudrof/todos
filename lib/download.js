// File names made from a document title: "Week-end chez Mamie" →
// "week-end-chez-mamie.pdf".
export function docFileName(doc, extension) {
  const slug = String(doc.title || "liste")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${slug || "liste"}.${extension}`;
}

// Hands a file to the browser as a download.
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadJson(text, fileName) {
  downloadBlob(new Blob([text], { type: "application/json" }), fileName);
}
