"use client";

import { useState } from "react";
import * as model from "../lib/model.js";
import * as store from "../lib/store.js";
import { eventToText, parseText, splitEmoji } from "../lib/format.js";
import { shareUrl } from "../lib/link.js";
import { THEMES, getTheme } from "../lib/themes.js";
import ListCard from "./ListCard.js";
import AgentHelp from "./AgentHelp.js";
import {
  Editable,
  EmojiPicker,
  EVENT_EMOJIS,
  Garland,
  countdown,
  formatDate,
} from "./ui.js";

export function themeStyle(theme) {
  return {
    "--bg": theme.bg,
    "--dot": theme.dot,
    "--accent": theme.accent,
    "--soft": theme.soft,
  };
}

export default function EventView({ event, id, notify }) {
  const [panel, setPanel] = useState(null);
  const [text, setText] = useState("");
  const [newList, setNewList] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!event) {
    return (
      <main className="page missing">
        <a href="#" className="back">
          ← Mes évènements
        </a>
        <h1>Cet évènement n’est pas sur cet appareil</h1>
        <p>
          Les listes restent dans le navigateur où elles ont été créées.
          Demandez le lien de partage à la personne qui l’a préparée.
        </p>
        <p className="muted">Identifiant : {id}</p>
      </main>
    );
  }

  const theme = getTheme(event.theme);
  const lists = model.sortedLists(event);
  const { done, total } = model.progress(event);
  const hasEveryone = event.lists.some(model.isEveryone);
  const soon = countdown(event.date);
  const people = lists.filter((list) => !model.isEveryone(list));

  const act = (fn, ...args) => {
    try {
      store.change(event.id, fn, ...args);
    } catch (error) {
      notify(error.message);
    }
  };

  const togglePanel = (name) => {
    if (name === "text") setText(eventToText(event));
    setPanel(panel === name ? null : name);
  };

  const share = async () => {
    const url = shareUrl(event, window.location.href.split("#")[0]);
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: event.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify(
        "Lien copié : envoyez-le, la liste s’ouvrira avec ses cases cochées.",
      );
    } catch (error) {
      if (error?.name !== "AbortError") {
        setPanel("link");
        setText(url);
      }
    }
  };

  const addPerson = (e) => {
    e.preventDefault();
    if (!newList.trim()) return;
    const { name, emoji } = splitEmoji(newList);
    act(model.addList, { name, emoji });
    setNewList("");
  };

  const replaceFromText = () => {
    const parsed = parseText(text);
    const previous = event;
    store.saveEvent(
      model.createEvent({
        ...parsed,
        id: event.id,
        createdAt: event.createdAt,
        title: parsed.title || event.title,
        emoji: parsed.title ? parsed.emoji : event.emoji,
        theme: parsed.theme || event.theme,
      }),
    );
    setPanel(null);
    notify("Listes remplacées.", {
      label: "Annuler",
      run: () => store.saveEvent(previous),
    });
  };

  const addFromText = () => {
    act(model.mergeInto, parseText(text));
    setPanel(null);
    notify("Ajouté à l’évènement.");
  };

  const remove = () => {
    store.deleteEvent(event.id);
    window.location.hash = "";
    notify(`« ${event.title} » supprimé.`, {
      label: "Annuler",
      run: () => store.saveEvent(event),
    });
  };

  return (
    <main className="event" style={themeStyle(theme)} data-theme={theme.id}>
      <Garland colors={theme.flags} />
      <div className="decor" aria-hidden="true">
        {theme.decor.map((emoji, i) => (
          <span key={i} className={`decor-${i}`}>
            {emoji}
          </span>
        ))}
      </div>

      <nav className="topbar">
        <a href="#" className="back">
          ← Mes évènements
        </a>
        <div className="actions">
          <button type="button" onClick={share}>
            🔗 Partager
          </button>
          <button type="button" onClick={() => window.print()}>
            🖨️ Imprimer
          </button>
          <button
            type="button"
            onClick={() => togglePanel("text")}
            aria-expanded={panel === "text"}
          >
            ✍️ Texte
          </button>
          <button
            type="button"
            onClick={() => togglePanel("ai")}
            aria-expanded={panel === "ai"}
          >
            🤖 IA
          </button>
          <button
            type="button"
            onClick={() => togglePanel("more")}
            aria-expanded={panel === "more"}
          >
            ⋯
          </button>
        </div>
      </nav>

      <header className="event-head">
        <EmojiPicker
          value={event.emoji}
          choices={EVENT_EMOJIS}
          label="Changer l’emoji de l’évènement"
          onPick={(emoji) => act(model.updateEvent, { emoji })}
        >
          <span className="event-emoji">{event.emoji || theme.emoji}</span>
        </EmojiPicker>
        <h1>
          <Editable
            value={event.title}
            label="Renommer l’évènement"
            onSave={(title) => act(model.updateEvent, { title })}
          />
        </h1>
        <div className="event-meta">
          <label className="date">
            <span>
              {event.date ? formatDate(event.date) : "📅 Ajouter une date"}
            </span>
            <input
              type="date"
              value={event.date}
              aria-label="Date de l’évènement"
              onChange={(e) => act(model.updateEvent, { date: e.target.value })}
            />
          </label>
          {soon && <span className="soon">{soon}</span>}
          {total > 0 && (
            <span className="overall">
              {done === total
                ? "🎉 Tout le monde est prêt !"
                : `${done} / ${total} cochés`}
            </span>
          )}
        </div>
        <div className="themes" role="radiogroup" aria-label="Décor">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === theme.id}
              className={t.id === theme.id ? "on" : ""}
              style={{ "--chip": t.bg, "--chip-accent": t.accent }}
              onClick={() => act(model.updateEvent, { theme: t.id })}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </header>

      {panel === "text" && (
        <section className="panel" aria-label="Modifier en texte">
          <h2>✍️ Écrire en texte</h2>
          <p className="muted">
            Une ligne <code>Prénom : élément, élément</code> par personne.{" "}
            <code>[x]</code> devant un élément le coche. Vous pouvez aussi
            coller ici la réponse d’un assistant IA.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            spellCheck={false}
            aria-label="Texte des listes"
          />
          <div className="row">
            <button type="button" className="primary" onClick={replaceFromText}>
              Remplacer les listes
            </button>
            <button type="button" onClick={addFromText}>
              Ajouter sans rien effacer
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setPanel(null)}
            >
              Fermer
            </button>
          </div>
        </section>
      )}
      {panel === "link" && (
        <section className="panel" aria-label="Lien de partage">
          <h2>🔗 Lien de partage</h2>
          <p className="muted">
            Copiez ce lien et envoyez-le : il contient toute la liste.
          </p>
          <textarea
            value={text}
            readOnly
            rows={4}
            onFocus={(e) => e.target.select()}
            aria-label="Lien"
          />
        </section>
      )}
      {panel === "ai" && (
        <section className="panel" aria-label="Piloter avec une IA">
          <AgentHelp event={event} notify={notify} />
        </section>
      )}
      {panel === "more" && (
        <section className="panel" aria-label="Plus d’actions">
          <div className="row">
            <button type="button" onClick={() => act(model.uncheckAll)}>
              ↺ Tout décocher (pour réutiliser la liste)
            </button>
            <button type="button" onClick={() => act(model.removeDone)}>
              🧹 Retirer les éléments cochés
            </button>
            <button
              type="button"
              onClick={() => {
                const copy = model.createEvent({
                  ...event,
                  id: undefined,
                  title: `${event.title} (copie)`,
                });
                store.saveEvent(model.uncheckAll(copy));
                window.location.hash = `/${copy.id}`;
              }}
            >
              📄 Dupliquer
            </button>
            {confirmDelete ? (
              <button
                type="button"
                className="danger"
                onClick={remove}
                onBlur={() => setConfirmDelete(false)}
                autoFocus
              >
                Oui, supprimer « {event.title} »
              </button>
            ) : (
              <button
                type="button"
                className="danger-ghost"
                onClick={() => setConfirmDelete(true)}
              >
                🗑️ Supprimer l’évènement
              </button>
            )}
          </div>
        </section>
      )}

      <section className="cards">
        {lists.map((list) => {
          const index = people.indexOf(list);
          return (
            <ListCard
              key={list.id}
              list={list}
              act={act}
              canMoveLeft={index > 0}
              canMoveRight={index >= 0 && index < people.length - 1}
            />
          );
        })}

        <div className="card new-card">
          <form onSubmit={addPerson}>
            <h2>Ajouter une personne</h2>
            <div className="add">
              <input
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                placeholder="Prénom ou groupe (Enfants, Parents…)"
                aria-label="Nom de la nouvelle liste"
              />
              <button
                type="submit"
                aria-label="Créer la liste"
                disabled={!newList.trim()}
              >
                +
              </button>
            </div>
          </form>
          {!hasEveryone && (
            <button
              type="button"
              className="link"
              onClick={() => act(model.addList, { name: model.EVERYONE_NAME })}
            >
              🌟 Ajouter une liste pour tout le monde
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
