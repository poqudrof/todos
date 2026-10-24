"use client";

import { useState } from "react";
import * as model from "../lib/model.js";
import * as store from "../lib/store.js";
import { parseText } from "../lib/format.js";
import { textFromUrl } from "../lib/link.js";
import { THEMES, getTheme } from "../lib/themes.js";
import AgentHelp from "./AgentHelp.js";
import { EmojiPicker, EVENT_EMOJIS, Garland, countdown } from "./ui.js";

const EXAMPLE = `Parents : Lit bébé, tapis, habits, couches, trousse de toilette
Achille 🦁 : Sac avec doudou
Lily 🐰 : Sac avec doudou
Enfants : 3 jeux de société et 4 livres chacun`;

export default function Home({ events, notify }) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🧳");
  const [theme, setTheme] = useState("voyage");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");

  const create = (e) => {
    e.preventDefault();
    // A link pasted from an assistant works as well as plain text.
    const source = /^https?:\/\//.test(text.trim())
      ? textFromUrl(text.trim()) || ""
      : text;
    const parsed = parseText(source);
    const event = model.createEvent({
      ...parsed,
      id: undefined,
      title: title.trim() || parsed.title || "Mon évènement",
      emoji: title.trim() ? emoji : parsed.emoji || emoji,
      theme: parsed.theme && !title.trim() ? parsed.theme : theme,
      date: date || parsed.date,
    });
    store.saveEvent(event);
    window.location.hash = `/${event.id}`;
    notify("Évènement créé ✨");
  };

  return (
    <main className="home">
      <Garland
        colors={["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8"]}
        count={19}
      />
      <header className="hero">
        <p className="brand">
          <span className="brand-icon" aria-hidden="true">
            ✓
          </span>{" "}
          Todos
        </p>
        <h1>Qui apporte quoi&nbsp;?</h1>
        <p className="lead">
          Une liste à cocher pour chaque personne, une autre pour tout le monde.
          Pour les valises, les fêtes, les week-ends. Sans compte : tout reste
          dans votre navigateur, et un lien suffit pour partager.
        </p>
      </header>

      {events.length > 0 && (
        <section className="mine" aria-label="Mes évènements">
          <h2>Mes évènements</h2>
          <div className="event-grid">
            {events.map((event) => {
              const t = getTheme(event.theme);
              const { done, total } = model.progress(event);
              const soon = countdown(event.date);
              return (
                <a
                  key={event.id}
                  href={`#/${event.id}`}
                  className="event-tile"
                  style={{
                    "--bg": t.bg,
                    "--accent": t.accent,
                    "--dot": t.dot,
                    "--soft": t.soft,
                  }}
                >
                  <span className="tile-emoji" aria-hidden="true">
                    {event.emoji || t.emoji}
                  </span>
                  <span className="tile-title">{event.title}</span>
                  <span className="tile-meta">
                    {event.lists.length} liste
                    {event.lists.length > 1 ? "s" : ""}
                    {total > 0 && ` · ${done}/${total}`}
                    {soon && ` · ${soon}`}
                  </span>
                  <span className="bar" aria-hidden="true">
                    <span
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="create card" aria-label="Nouvel évènement">
        <h2>Nouvel évènement</h2>
        <form onSubmit={create}>
          <div className="title-row">
            <EmojiPicker
              value={emoji}
              choices={EVENT_EMOJIS}
              label="Emoji de l’évènement"
              onPick={(e) => setEmoji(e || "🎉")}
              allowNone={false}
            >
              <span className="event-emoji small">{emoji}</span>
            </EmojiPicker>
            <input
              className="big"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de l’évènement (Week-end chez Mamie…)"
              aria-label="Nom de l’évènement"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date (facultatif)"
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
                onClick={() => {
                  setTheme(t.id);
                  setEmoji(t.emoji);
                }}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              Les listes{" "}
              <span className="muted">
                — facultatif, une ligne par personne, ou collez la réponse d’une
                IA
              </span>
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={EXAMPLE}
              spellCheck={false}
            />
          </label>
          <div className="row">
            <button type="submit" className="primary">
              Créer l’évènement
            </button>
            {!text && (
              <button
                type="button"
                className="ghost"
                onClick={() => setText(EXAMPLE)}
              >
                Essayer avec l’exemple
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <AgentHelp notify={notify} />
      </section>

      <footer className="foot">
        Les listes sont enregistrées dans ce navigateur uniquement. Pour les
        retrouver ailleurs, utilisez 🔗 Partager.
      </footer>
    </main>
  );
}
