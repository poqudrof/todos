"use client";

import { useState } from "react";
import * as model from "../lib/model.js";
import * as store from "../lib/store.js";
import { docFromText, parseText } from "../lib/format.js";
import { textFromUrl } from "../lib/link.js";
import { EXAMPLES } from "../lib/examples.js";
import { THEMES, getTheme } from "../lib/themes.js";
import { DOC_EMOJIS, EmojiPicker, Garland } from "./ui.js";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PLACEHOLDER = `Parents : Lit bébé, tapis, habits, couches
Achille 🦁 : Sac avec doudou
Lily 🐰 : Sac avec doudou`;
const examples = EXAMPLES.map((example) => ({
  ...example,
  doc: docFromText(example.text),
}));

function open(doc) {
  store.saveDoc(doc);
  window.location.hash = `/${doc.id}`;
}

export default function Home({ docs, notify }) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🏡");
  const [theme, setTheme] = useState("fete");
  const [text, setText] = useState("");

  const create = (e) => {
    e.preventDefault();
    // A share link pasted here works as well as plain text.
    const source = /^https?:\/\//.test(text.trim())
      ? textFromUrl(text.trim()) || ""
      : text;
    const parsed = parseText(source);
    open(
      model.createDoc({
        ...parsed,
        id: undefined,
        title: title.trim() || parsed.title,
        emoji: title.trim() ? emoji : parsed.emoji || emoji,
        theme: parsed.theme || theme,
      }),
    );
  };

  const startFrom = (example) => {
    open(docFromText(example.text));
    notify("Exemple copié dans vos listes : modifiez-le à votre goût.");
  };

  return (
    <main className="home">
      <Garland colors={getTheme("fete").flags} count={19} />
      <header className="hero">
        <p className="brand">
          <span className="brand-icon" aria-hidden="true">
            ✓
          </span>{" "}
          Todos
        </p>
        <h1>De jolies listes à afficher</h1>
        <p className="lead">
          Une liste, ou une liste par personne. Choisissez un décor et imprimez
          un PDF soigné pour le frigo, l’entrée ou la chambre des enfants.
        </p>
      </header>

      {docs.length > 0 && (
        <section className="block" aria-label="Mes listes">
          <h2>Mes listes</h2>
          <div className="doc-grid">
            {docs.map((doc) => {
              const t = getTheme(doc.theme);
              return (
                <a
                  key={doc.id}
                  href={`#/${doc.id}`}
                  className="doc-tile"
                  style={{ "--bg": t.bg, "--accent": t.accent }}
                >
                  <span className="tile-emoji" aria-hidden="true">
                    {doc.emoji || t.emoji}
                  </span>
                  <span className="tile-title">{doc.title}</span>
                  <span className="tile-meta">
                    {doc.lists.map((l) => l.name).join(" · ") || "Vide"}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="block" aria-label="Exemples">
        <h2>Exemples</h2>
        <p className="muted">
          Téléchargez-les tels quels, ou partez de l’un d’eux.
        </p>
        <div className="examples">
          {examples.map((example) => {
            const t = getTheme(example.doc.theme);
            return (
              <article
                key={example.slug}
                className="example"
                style={{ "--bg": t.bg, "--accent": t.accent }}
              >
                <a
                  href={`${base}/exemples/${example.slug}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className={`thumb ${example.doc.pdf.orientation}`}
                >
                  <img
                    src={`${base}/exemples/${example.slug}.png`}
                    alt={`Aperçu du PDF « ${example.doc.title} »`}
                    loading="lazy"
                  />
                </a>
                <div className="example-body">
                  <h3>
                    {example.doc.emoji} {example.doc.title}
                  </h3>
                  <p className="muted">
                    {example.doc.lists.map((l) => l.name).join(" · ")}
                  </p>
                  <div className="row">
                    <button
                      type="button"
                      className="primary small"
                      onClick={() => startFrom(example)}
                    >
                      Modifier
                    </button>
                    <a
                      className="button small"
                      href={`${base}/exemples/${example.slug}.pdf`}
                      download
                    >
                      PDF
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="block card create" aria-label="Nouvelle liste">
        <h2>Nouvelle liste</h2>
        <form onSubmit={create}>
          <div className="title-row">
            <EmojiPicker
              value={emoji}
              choices={DOC_EMOJIS}
              label="Emoji du titre"
              onPick={(e) => setEmoji(e || "🏡")}
              allowNone={false}
            >
              <span className="doc-emoji small">{emoji}</span>
            </EmojiPicker>
            <input
              className="big"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre (Week-end chez Mamie, Courses…)"
              aria-label="Titre"
            />
          </div>
          <div className="themes" role="radiogroup" aria-label="Décor">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === theme}
                className={t.id === theme ? "on" : ""}
                style={{ "--chip": t.bg, "--chip-accent": t.accent }}
                onClick={() => setTheme(t.id)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              Le contenu{" "}
              <span className="muted">
                — facultatif : une ligne « Nom : élément, élément » par liste
              </span>
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={PLACEHOLDER}
              spellCheck={false}
            />
          </label>
          <div className="row">
            <button type="submit" className="primary">
              Créer
            </button>
          </div>
        </form>
      </section>

      <footer className="foot">
        Sans compte : vos listes restent dans ce navigateur.
      </footer>
    </main>
  );
}
