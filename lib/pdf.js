// A4 PDF of a document, made to be printed and pinned on a wall. Runs in the
// browser and in Node: the caller passes the font files and a function that
// turns an emoji into a PNG (or null when it cannot).
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { EMOJI } from "./format.js";
import { isEveryone, listColors, sortedLists } from "./model.js";
import { getTheme } from "./themes.js";
import { SITE_URL } from "./site.js";
import { docFileName } from "./download.js";

const A4 = [595.28, 841.89];
const FRAME = 16; // frame inset from the paper edge
const MARGIN = 34; // content inset from the paper edge
const FOOTER = 24;
const EVERYONE_EMOJI = "🌟";
const EMOJI_RE = new RegExp(EMOJI, "gu");

// ——— Colors ———

function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(color, other, amount) {
  const a = hex(color);
  const b = hex(other);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function pdfColor(color) {
  const [r, g, b] = hex(color);
  return rgb(r / 255, g / 255, b / 255);
}

// Color of a list, plus its light tints.
function shades(color) {
  return {
    main: color,
    band: mix(color, "#ffffff", 0.86),
    line: mix(color, "#ffffff", 0.62),
    rule: mix(color, "#ffffff", 0.8),
  };
}

// ——— Text with emojis ———

export function emojisIn(text) {
  return String(text || "").match(EMOJI_RE) || [];
}

function allEmojis(doc, theme) {
  const found = new Set([EVERYONE_EMOJI, ...theme.decor]);
  const add = (text) => emojisIn(text).forEach((e) => found.add(e));
  add(doc.title);
  add(doc.emoji);
  add(doc.subtitle);
  for (const list of doc.lists) {
    add(list.emoji);
    add(list.name);
    list.items.forEach((item) => add(item.text));
  }
  return [...found];
}

class Writer {
  constructor(font, checker, emojis) {
    this.font = font;
    this.checker = checker;
    this.emojis = emojis;
  }

  // Splits a text into words and emojis, dropping characters the font lacks.
  tokens(text) {
    const out = [];
    let last = 0;
    const source = String(text || "");
    const push = (chunk) => {
      const clean = [...chunk.replace(/[\ufe0f\u200d]/g, "")]
        .filter(
          (c) =>
            /\s/.test(c) || this.checker.hasGlyphForCodePoint(c.codePointAt(0)),
        )
        .join("");
      for (const part of clean.split(/(\s+)/)) {
        if (part)
          out.push({ kind: /^\s+$/.test(part) ? "space" : "word", text: part });
      }
    };
    for (const match of source.matchAll(EMOJI_RE)) {
      push(source.slice(last, match.index));
      if (this.emojis.get(match[0]))
        out.push({ kind: "emoji", text: match[0] });
      last = match.index + match[0].length;
    }
    push(source.slice(last));
    return out;
  }

  width(token, size) {
    if (token.kind === "emoji") return size * 1.12;
    return this.font.widthOfTextAtSize(
      token.kind === "space" ? " " : token.text,
      size,
    );
  }

  // Greedy word wrap. Returns lines of tokens with their widths.
  wrap(text, size, maxWidth) {
    const lines = [];
    let line = [];
    let width = 0;
    let pendingSpace = false;
    let cut = false;
    const flush = () => {
      if (line.length) lines.push({ tokens: line, width });
      line = [];
      width = 0;
    };
    const place = (token) => {
      const w = this.width(token, size);
      const space =
        line.length && pendingSpace ? this.width({ kind: "space" }, size) : 0;
      if (line.length && width + space + w > maxWidth) {
        // An emoji goes to the next line with the word before it.
        const carry = [];
        if (
          token.kind === "emoji" &&
          line.length >= 3 &&
          line.at(-1).kind === "word"
        ) {
          carry.push(line.pop());
          width -= carry[0].w;
          if (line.at(-1)?.kind === "space") width -= line.pop().w;
        }
        flush();
        for (const kept of carry) {
          line.push(kept);
          width += kept.w;
        }
        if (carry.length) {
          const gap = this.width({ kind: "space" }, size);
          line.push({ kind: "space", text: " ", w: gap });
          width += gap;
        }
      } else if (space) {
        line.push({ kind: "space", text: " ", w: space });
        width += space;
      }
      line.push({ ...token, w });
      width += w;
      pendingSpace = false;
    };
    for (const token of this.tokens(text)) {
      if (token.kind === "space") {
        pendingSpace = true;
        continue;
      }
      if (token.kind === "word" && this.width(token, size) > maxWidth) {
        // A word longer than the line is cut into pieces.
        cut = true;
        let piece = "";
        for (const char of token.text) {
          if (
            piece &&
            this.width({ kind: "word", text: piece + char }, size) > maxWidth
          ) {
            place({ kind: "word", text: piece });
            pendingSpace = false;
            piece = "";
          }
          piece += char;
        }
        if (piece) place({ kind: "word", text: piece });
      } else place(token);
    }
    flush();
    const result = lines.length ? lines : [{ tokens: [], width: 0 }];
    result.cut = cut;
    return result;
  }

  measure(text, size) {
    return this.tokens(text).reduce(
      (sum, token) => sum + this.width(token, size),
      0,
    );
  }

  // Draws one wrapped line; y is the baseline, top-down.
  drawLine(sheet, line, x, y, size, color) {
    let cx = x;
    for (const token of line.tokens) {
      if (token.kind === "emoji") {
        const box = size * 1.08;
        sheet.image(
          this.emojis.get(token.text),
          cx + size * 0.02,
          y - size * 0.86,
          box,
          box,
        );
      } else if (token.kind === "word") {
        sheet.text(token.text, cx, y, this.font, size, color);
      }
      cx += token.w;
    }
  }
}

// ——— Drawing in top-down coordinates ———

class Sheet {
  constructor(pdf, size) {
    this.page = pdf.addPage(size);
    this.w = size[0];
    this.h = size[1];
  }
  path(d, options) {
    this.page.drawSvgPath(d, { x: 0, y: this.h, ...options });
  }
  roundRect(x, y, w, h, r, options, corners = [r, r, r, r]) {
    const [tl, tr, br, bl] = corners;
    this.path(
      `M ${x + tl} ${y} H ${x + w - tr} Q ${x + w} ${y} ${x + w} ${y + tr} V ${y + h - br} Q ${x + w} ${y + h} ${x + w - br} ${y + h} H ${x + bl} Q ${x} ${y + h} ${x} ${y + h - bl} V ${y + tl} Q ${x} ${y} ${x + tl} ${y} Z`,
      options,
    );
  }
  circle(cx, cy, r, options) {
    this.page.drawCircle({ x: cx, y: this.h - cy, size: r, ...options });
  }
  line(x1, y1, x2, y2, options) {
    this.page.drawLine({
      start: { x: x1, y: this.h - y1 },
      end: { x: x2, y: this.h - y2 },
      ...options,
    });
  }
  text(text, x, baseline, font, size, color) {
    this.page.drawText(text, {
      x,
      y: this.h - baseline,
      font,
      size,
      color: pdfColor(color),
    });
  }
  image(image, x, top, w, h, opacity = 1) {
    if (image)
      this.page.drawImage(image, {
        x,
        y: this.h - top - h,
        width: w,
        height: h,
        opacity,
      });
  }
}

// ——— Page decorations ———

function drawFrame(sheet, theme) {
  const color = pdfColor(mix(theme.accent, "#ffffff", 0.45));
  sheet.roundRect(FRAME, FRAME, sheet.w - 2 * FRAME, sheet.h - 2 * FRAME, 14, {
    borderColor: color,
    borderWidth: 1.1,
  });
  if (!theme.flags) {
    // Classic style: a second fine frame and small diamonds in the corners.
    const inset = FRAME + 4;
    sheet.roundRect(
      inset,
      inset,
      sheet.w - 2 * inset,
      sheet.h - 2 * inset,
      11,
      {
        borderColor: color,
        borderWidth: 0.4,
      },
    );
    for (const [x, y] of [
      [inset + 10, inset + 10],
      [sheet.w - inset - 10, inset + 10],
      [inset + 10, sheet.h - inset - 10],
      [sheet.w - inset - 10, sheet.h - inset - 10],
    ]) {
      sheet.path(
        `M ${x} ${y - 4} L ${x + 4} ${y} L ${x} ${y + 4} L ${x - 4} ${y} Z`,
        {
          color: pdfColor(theme.accent),
        },
      );
    }
  }
}

// Bunting hanging along the top of the page. Returns its bottom.
function drawGarland(sheet, theme) {
  if (!theme.flags) return FRAME + 18;
  const left = FRAME + 6;
  const right = sheet.w - FRAME - 6;
  const top = FRAME + 8;
  const sag = 22;
  const string = pdfColor(mix(theme.ink, "#ffffff", 0.55));
  sheet.path(
    `M ${left} ${top} Q ${(left + right) / 2} ${top + 2 * sag} ${right} ${top}`,
    {
      borderColor: string,
      borderWidth: 0.8,
    },
  );
  const count = Math.round((right - left) / 30);
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = left + (right - left) * t;
    const y = top + 4 * sag * t * (1 - t);
    const angle = Math.atan2(4 * sag * (1 - 2 * t), right - left);
    const fw = 15;
    const fh = 19;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pt = (dx, dy) =>
      `${x + dx * cos - dy * sin} ${y + dx * sin + dy * cos}`;
    const color = theme.flags[(i - 1) % theme.flags.length];
    sheet.path(`M ${pt(-fw / 2, 0)} L ${pt(fw / 2, 0)} L ${pt(0, fh)} Z`, {
      color: pdfColor(color),
      borderColor: pdfColor(mix(color, theme.ink, 0.18)),
      borderWidth: 0.3,
    });
  }
  return top + sag + 22;
}

function drawFooter(sheet, ctx) {
  const label = SITE_URL.replace(/^https?:\/\//, "");
  const size = 6.5;
  const width = ctx.body.font.widthOfTextAtSize(label, size);
  sheet.text(
    label,
    (sheet.w - width) / 2,
    sheet.h - FRAME - 7,
    ctx.body.font,
    size,
    mix(ctx.theme.ink, "#ffffff", 0.6),
  );
}

// A short centered rule with a dot, under the titles.
function drawDivider(sheet, theme, y) {
  const cx = sheet.w / 2;
  const color = pdfColor(mix(theme.accent, "#ffffff", 0.35));
  sheet.line(cx - 46, y, cx - 8, y, { thickness: 0.7, color });
  sheet.line(cx + 8, y, cx + 46, y, { thickness: 0.7, color });
  sheet.path(
    `M ${cx} ${y - 3} L ${cx + 3} ${y} L ${cx} ${y + 3} L ${cx - 3} ${y} Z`,
    { color },
  );
}

// Title block of a page. Returns the y where content can start.
function drawHeader(sheet, ctx, { title, emoji, subtitle, big = true }) {
  const { theme } = ctx;
  let y = drawGarland(sheet, theme) + (big ? 8 : 2);
  const maxWidth = sheet.w - 2 * MARGIN - 90;
  const label = [emoji, title].filter(Boolean).join(" ");
  let size = big ? 34 : 22;
  while (size > 16 && ctx.title.measure(label, size) > maxWidth) size -= 1;
  const lines = ctx.title.wrap(label, size, maxWidth);
  for (const line of lines) {
    y += size * 1.02;
    const x = (sheet.w - line.width) / 2;
    ctx.title.drawLine(sheet, line, x, y, size, theme.ink);
    if (line === lines[0] && big && theme.decor.length) {
      const deco = size * 0.8;
      const [a, b] = theme.decor.map((e) => ctx.emojis.get(e));
      sheet.image(a, x - deco - 22, y - size * 0.85, deco, deco, 0.55);
      sheet.image(
        b || a,
        x + line.width + 22,
        y - size * 0.85,
        deco,
        deco,
        0.55,
      );
    }
    y += size * 0.2;
  }
  if (subtitle) {
    const subSize = big ? 12 : 10.5;
    for (const line of ctx.body.wrap(subtitle, subSize, maxWidth)) {
      y += subSize * 1.35;
      ctx.body.drawLine(
        sheet,
        line,
        (sheet.w - line.width) / 2,
        y,
        subSize,
        mix(theme.ink, "#ffffff", 0.35),
      );
    }
  }
  y += 12;
  drawDivider(sheet, theme, y);
  return y + 16;
}

// ——— Cards ———

function drawAvatar(sheet, ctx, list, color, cx, cy, d) {
  if (list.free) {
    // Left empty, to draw or write initials in.
    sheet.circle(cx, cy, d / 2, {
      color: rgb(1, 1, 1),
      borderColor: pdfColor(color),
      borderWidth: Math.max(0.9, d * 0.035),
      borderDashArray: [d * 0.07, d * 0.07],
    });
    return;
  }
  const emoji = list.emoji || (isEveryone(list) ? EVERYONE_EMOJI : "");
  const image = emoji && ctx.emojis.get(emoji);
  if (image) {
    sheet.circle(cx, cy, d / 2, {
      color: pdfColor(mix(color, "#ffffff", 0.75)),
    });
    const size = d * 0.64;
    sheet.image(image, cx - size / 2, cy - size / 2, size, size);
  } else {
    sheet.circle(cx, cy, d / 2, { color: pdfColor(color) });
    const letter = (list.name.trim()[0] || "?").toUpperCase();
    const size = d * 0.52;
    const w = ctx.title.measure(letter, size);
    sheet.text(
      letter,
      cx - w / 2,
      cy + size * 0.36,
      ctx.title.font,
      size,
      "#ffffff",
    );
  }
}

function drawBox(sheet, x, top, size, color, round) {
  const options = {
    borderColor: pdfColor(color),
    borderWidth: Math.max(0.9, size * 0.09),
    color: rgb(1, 1, 1),
  };
  if (round) sheet.circle(x + size / 2, top + size / 2, size / 2, options);
  else sheet.roundRect(x, top, size, size, size * 0.22, options);
}

// The extra list with no name, when one is wanted.
function freeList(ctx) {
  if (!ctx.pdf.freeLines) return null;
  return { id: "libre", name: "", emoji: "", items: [], free: true };
}

function cardColor(ctx, list) {
  if (list.free) return mix(ctx.theme.ink, "#ffffff", 0.45);
  return ctx.colors.get(list.id) || ctx.theme.accent;
}

// Measures a card and returns its height and a function that draws it.
// `s` is the item text size; `cols` splits the items into columns.
function layoutCard(
  ctx,
  list,
  width,
  s,
  { cols = 1, header = true, continued = false, blank, extra = 0 } = {},
) {
  const color = cardColor(ctx, list);
  const shade = shades(color);
  const pad = s * 0.95;
  const box = s * 0.98;
  const gap = s * 0.6;
  const lineH = s * 1.3;
  const rowGap = s * 0.55 + extra;

  // The name shrinks a little to fit, then goes on two lines.
  const d = s * 1.95;
  const nameX = pad + d + s * 0.6;
  const nameW = width - pad - nameX;
  const name = list.name + (continued ? " (suite)" : "");
  let nameSize = s * 1.32;
  while (nameSize > s * 1.02 && ctx.title.measure(name, nameSize) > nameW)
    nameSize -= s * 0.05;
  // A free list has a line to write its name on instead.
  const nameLines = list.free
    ? []
    : ctx.title.wrap(name, nameSize, nameW).slice(0, 2);
  const nameH = Math.max(1, nameLines.length) * nameSize * 1.12;
  const headH = header ? Math.max(s * 2.7, nameH + s * 1.1) : 0;
  const colGap = s * 1.3;
  const items = list.items;
  blank ??= list.free
    ? ctx.pdf.freeLines
    : items.length === 0
      ? Math.max(ctx.pdf.blankLines, 3)
      : ctx.pdf.blankLines;

  const colW = (width - 2 * pad - (cols - 1) * colGap) / cols;
  const textW = colW - box - gap;
  const rows = items.map((item) => {
    const lines = ctx.body.wrap(item.text, s, textW);
    return { lines, h: lines.length * lineH + rowGap };
  });
  for (let i = 0; i < blank; i++)
    rows.push({ blank: true, h: lineH * 1.45 + rowGap });

  // Columns filled top to bottom, balanced by height.
  const total = rows.reduce((sum, row) => sum + row.h, 0);
  const columns = [[]];
  let acc = 0;
  for (const row of rows) {
    if (
      columns.length < cols &&
      acc > 0 &&
      acc + row.h / 2 > (total / cols) * columns.length
    ) {
      columns.push([]);
    }
    columns[columns.length - 1].push(row);
    acc += row.h;
  }
  const bodyH = Math.max(
    ...columns.map((c) => c.reduce((sum, row) => sum + row.h, 0)),
    lineH,
  );
  const height = headH + pad * 0.85 + bodyH - rowGap + pad;
  const cuts = rows.some((row) => row.lines?.cut) || (header && nameLines.cut);

  // `tall` stretches the card down; with blank lines wanted, the extra room
  // gets more of them.
  const draw = (sheet, x, y, tall = height) => {
    if (cols === 1 && ctx.pdf.blankLines > 0) {
      const blankH = lineH * 1.45 + rowGap;
      const more = Math.floor((tall - height) / blankH);
      for (let i = 0; i < more; i++)
        columns[0].push({ blank: true, h: blankH });
    }
    sheet.roundRect(x, y, width, tall, 12, {
      color: rgb(1, 1, 1),
      borderColor: pdfColor(shade.line),
      borderWidth: 0.9,
    });
    if (header) {
      sheet.roundRect(
        x,
        y,
        width,
        headH,
        12,
        { color: pdfColor(shade.band) },
        [12, 12, 0, 0],
      );
      sheet.line(x, y + headH, x + width, y + headH, {
        thickness: 0.9,
        color: pdfColor(shade.line),
      });
      drawAvatar(sheet, ctx, list, color, x + pad + d / 2, y + headH / 2, d);
      let baseline = y + (headH - nameH) / 2 + nameSize * 0.82;
      if (list.free) {
        const base = baseline + nameSize * 0.12;
        sheet.line(x + nameX, base, x + width - pad, base, {
          thickness: 0.9,
          color: pdfColor(shade.line),
        });
      }
      for (const line of nameLines) {
        ctx.title.drawLine(
          sheet,
          line,
          x + nameX,
          baseline,
          nameSize,
          ctx.theme.ink,
        );
        baseline += nameSize * 1.12;
      }
    }
    columns.forEach((column, c) => {
      const cx = x + pad + c * (colW + colGap);
      let cy = y + headH + pad * 0.85;
      column.forEach((row, index) => {
        drawBox(
          sheet,
          cx,
          cy + (lineH - box) / 2 + (row.blank ? lineH * 0.3 : 0),
          box,
          color,
          ctx.pdf.boxes === "rondes",
        );
        if (row.blank) {
          const base = cy + lineH * 1.3;
          sheet.line(cx + box + gap, base, cx + colW, base, {
            thickness: 0.6,
            color: pdfColor(shade.line),
          });
        } else {
          row.lines.forEach((line, i) => {
            ctx.body.drawLine(
              sheet,
              line,
              cx + box + gap,
              cy + i * lineH + s * 0.98,
              s,
              ctx.theme.ink,
            );
          });
          const next = column[index + 1];
          if (next && !next.blank) {
            const ry = cy + row.h - rowGap / 2;
            sheet.line(cx + box + gap, ry, cx + colW, ry, {
              thickness: 0.5,
              color: pdfColor(shade.rule),
              dashArray: [1.2, 2.2],
              lineCap: 1,
            });
          }
        }
        cy += row.h;
      });
    });
  };
  const wraps = rows.some((row) => row.lines?.length > 1);
  return { height, draw, cuts, wraps };
}

// ——— Layouts ———

function contentBox(sheet, top) {
  return {
    x: MARGIN,
    y: top,
    w: sheet.w - 2 * MARGIN,
    bottom: sheet.h - MARGIN - FOOTER + 10,
  };
}

function columnCount(n, landscape) {
  if (landscape) return n <= 4 ? n : n <= 6 ? 3 : 4;
  if (n <= 3) return n;
  return n === 4 ? 2 : 3;
}

function rowCount(ctx, list) {
  return list.free ? ctx.pdf.freeLines : list.items.length;
}

function itemColumns(ctx, list, width, s) {
  const perColumn = Math.max(1, Math.floor(width / (s * 17)));
  return Math.max(1, Math.min(perColumn, Math.ceil(rowCount(ctx, list) / 3)));
}

// Places everything; returns cards with positions, or null if it does not fit.
function arrangeOnePage(ctx, box, s, extra = 0) {
  const lists = sortedLists(ctx.doc);
  const shared = lists.filter(isEveryone);
  const others = lists.filter((l) => !isEveryone(l));
  const gap = s * 1.3;
  const placed = [];
  let cuts = false;
  let y = box.y;
  for (const list of shared.concat(others.length === 1 ? others : [])) {
    const card = layoutCard(ctx, list, box.w, s, {
      cols: itemColumns(ctx, list, box.w, s),
      extra,
    });
    placed.push({ card, x: box.x, y });
    cuts ||= card.cuts;
    y += card.height + gap;
  }
  const rest = others.length === 1 ? [] : others;
  if (rest.length) {
    const cols = columnCount(rest.length, ctx.landscape);
    const colW = (box.w - (cols - 1) * gap) / cols;
    const heights = new Array(cols).fill(y);
    for (const list of rest) {
      const c = heights.indexOf(Math.min(...heights));
      const card = layoutCard(ctx, list, colW, s, {
        cols: itemColumns(ctx, list, colW, s),
        extra,
      });
      placed.push({
        card,
        x: box.x + c * (colW + gap),
        y: heights[c],
        column: c,
      });
      cuts ||= card.cuts;
      heights[c] += card.height + gap;
    }
    y = Math.max(...heights);
    // The last card of each column reaches the bottom of the tallest one.
    for (let c = 0; c < cols; c++) {
      const last = placed.filter((p) => p.column === c).at(-1);
      if (last) last.tall = y - gap - last.y;
    }
  }
  // The free list goes last, across the page.
  const free = freeList(ctx);
  if (free) {
    const card = layoutCard(ctx, free, box.w, s, {
      cols: itemColumns(ctx, free, box.w, s),
      extra,
    });
    placed.push({ card, x: box.x, y });
    y += card.height + gap;
  }
  return { placed, bottom: y - gap, cuts };
}

function onePage(ctx) {
  let sheet = ctx.newSheet();
  const top = drawHeader(sheet, ctx, {
    title: ctx.doc.title,
    emoji: ctx.doc.emoji,
    subtitle: ctx.doc.subtitle,
  });
  const box = contentBox(sheet, top);
  for (let s = ctx.landscape ? 18 : 20; s >= 8.5; s -= 0.5) {
    const first = arrangeOnePage(ctx, box, s);
    if (first.bottom > box.bottom || (first.cuts && s > 10)) continue;
    // Spare room: airier rows, then the block is lowered a little.
    let result;
    for (let extra = s * 1; extra >= 0; extra -= s * 0.1) {
      result = arrangeOnePage(ctx, box, s, Math.max(0, extra));
      if (result.bottom <= box.bottom && !result.cuts) break;
      result = first;
    }
    const shift = Math.min((box.bottom - result.bottom) * 0.3, 40);
    result.placed.forEach(({ card, x, y, tall }) =>
      card.draw(sheet, x, y + shift, tall),
    );
    return;
  }
  flowPages(ctx, sheet, box);
}

// Too long for one page: cards follow each other over several pages at a
// small size, long lists being cut where the page ends.
function flowPages(ctx, sheet, box) {
  const s = 10;
  const gap = s * 1.3;
  let y = box.y;
  const nextPage = () => {
    sheet = ctx.newSheet();
    const top = drawHeader(sheet, ctx, {
      title: ctx.doc.title,
      emoji: ctx.doc.emoji,
      big: false,
    });
    box = contentBox(sheet, top);
    y = box.y;
  };
  for (const list of printedLists(ctx)) {
    const cols = itemColumns(ctx, list, box.w, s);
    let items = list.items;
    let continued = false;
    do {
      const make = (count) =>
        layoutCard(ctx, { ...list, items: items.slice(0, count) }, box.w, s, {
          cols,
          continued,
          blank: count === items.length ? undefined : 0,
        });
      let count = items.length;
      let card = make(count);
      while (count > 1 && card.height > box.bottom - y) card = make(--count);
      if (card.height > box.bottom - y && y > box.y) {
        nextPage();
        continue;
      }
      card.draw(sheet, box.x, y);
      y += card.height + gap;
      items = items.slice(count);
      continued = true;
    } while (items.length);
  }
}

function printedLists(ctx) {
  const free = freeList(ctx);
  return free ? [...sortedLists(ctx.doc), free] : sortedLists(ctx.doc);
}

// One page per list, with large text: to pin up in each bedroom.
function pagePerList(ctx) {
  for (const list of printedLists(ctx)) {
    const sheet = ctx.newSheet();
    let y = drawHeader(sheet, ctx, {
      title: ctx.doc.title,
      emoji: ctx.doc.emoji,
      subtitle: ctx.doc.subtitle,
      big: false,
    });
    const color = cardColor(ctx, list);
    const d = 74;
    drawAvatar(sheet, ctx, list, color, sheet.w / 2, y + d / 2, d);
    y += d + 8;
    let size = 30;
    if (list.free) {
      // A line to write the name on.
      const w = Math.min(280, sheet.w - 2 * MARGIN);
      sheet.line((sheet.w - w) / 2, y + size, (sheet.w + w) / 2, y + size, {
        thickness: 1,
        color: pdfColor(shades(color).line),
      });
    } else {
      while (
        size > 18 &&
        ctx.title.measure(list.name, size) > sheet.w - 2 * MARGIN
      )
        size -= 1;
      const line = ctx.title.wrap(list.name, size, sheet.w - 2 * MARGIN)[0];
      ctx.title.drawLine(
        sheet,
        line,
        (sheet.w - line.width) / 2,
        y + size,
        size,
        ctx.theme.ink,
      );
    }
    y += size * 1.45;
    const box = contentBox(sheet, y);
    const room = box.bottom - box.y;
    // Largest text that fits, preferring sizes where each item stays on
    // one line.
    const fit = () => {
      for (const oneLine of [true, false]) {
        for (let s = 32; s >= (oneLine ? 16 : 9); s -= 0.5) {
          for (const cols of [1, 2, 3]) {
            if (cols > 1 && rowCount(ctx, list) < cols * 4) break;
            const card = layoutCard(ctx, list, box.w, s, {
              cols,
              header: false,
            });
            if (card.height > room || (card.cuts && s > 10)) continue;
            if (!oneLine || !card.wraps) return { s, cols };
          }
        }
      }
      return { s: 9, cols: 3 };
    };
    const { s, cols } = fit();
    // Spare room goes between the rows, so the list fills the page.
    let card = layoutCard(ctx, list, box.w, s, { cols, header: false });
    for (let extra = s * 1.5; extra > 0; extra -= s * 0.1) {
      const airy = layoutCard(ctx, list, box.w, s, {
        cols,
        header: false,
        extra,
      });
      if (airy.height <= room) {
        card = airy;
        break;
      }
    }
    card.draw(sheet, box.x, box.y);
  }
}

// ——— Entry point ———

export async function buildPdf(doc, assets) {
  const theme = getTheme(doc.theme);
  const pdfOptions = doc.pdf || {};
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title);
  pdf.setCreator(SITE_URL);
  pdf.setProducer("Todos");

  const emojiImages = new Map();
  for (const emoji of allEmojis(doc, theme)) {
    try {
      const png = await assets.emoji(emoji);
      if (png) emojiImages.set(emoji, await pdf.embedPng(png));
    } catch {
      // An emoji the system cannot draw is simply left out.
    }
  }

  const titleFont = await pdf.embedFont(assets.fonts.title, { subset: true });
  const bodyFont = await pdf.embedFont(assets.fonts.body, { subset: true });
  const landscape = pdfOptions.orientation === "paysage";
  const size = landscape ? [A4[1], A4[0]] : A4;

  const ctx = {
    doc,
    theme,
    pdf: { blankLines: 0, freeLines: 0, boxes: "carrees", ...pdfOptions },
    landscape,
    colors: listColors(doc, theme),
    emojis: emojiImages,
    title: new Writer(
      titleFont,
      fontkit.create(assets.fonts.title),
      emojiImages,
    ),
    body: new Writer(bodyFont, fontkit.create(assets.fonts.body), emojiImages),
  };
  ctx.newSheet = () => {
    const sheet = new Sheet(pdf, size);
    drawFrame(sheet, theme);
    drawFooter(sheet, ctx);
    return sheet;
  };

  const layout = pdfOptions.layout || "une";
  if (!doc.lists.length && !ctx.pdf.freeLines) {
    const sheet = ctx.newSheet();
    drawHeader(sheet, ctx, {
      title: doc.title,
      emoji: doc.emoji,
      subtitle: doc.subtitle,
    });
  } else {
    if (layout !== "chacun") onePage(ctx);
    if (layout !== "une") pagePerList(ctx);
  }
  return pdf.save();
}

export function pdfFileName(doc) {
  return docFileName(doc, "pdf");
}
