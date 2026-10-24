"use client";

import { useEffect, useRef, useState } from "react";
import * as model from "../lib/model.js";
import { personColor } from "../lib/themes.js";
import {
  Avatar,
  Confetti,
  Editable,
  EmojiPicker,
  PERSON_EMOJIS,
} from "./ui.js";

export default function ListCard({ list, act, canMoveLeft, canMoveRight }) {
  const everyone = model.isEveryone(list);
  const { done, total } = model.progress(list);
  const complete = total > 0 && done === total;
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const wasComplete = useRef(complete);

  // Confetti only when the last box gets ticked, not when the page loads.
  useEffect(() => {
    if (complete && !wasComplete.current) setBurst(Date.now());
    wasComplete.current = complete;
  }, [complete]);

  const add = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    act(model.addItems, list.id, draft);
    setDraft("");
  };

  return (
    <article
      className={`card ${everyone ? "everyone" : ""} ${complete ? "complete" : ""}`}
      style={{
        "--avatar-color": everyone ? "var(--accent)" : personColor(list.name),
      }}
      aria-label={`Liste ${list.name}`}
      data-list={list.name}
    >
      <Confetti burst={burst} />
      <header className="card-head">
        <EmojiPicker
          value={list.emoji}
          choices={PERSON_EMOJIS}
          label={`Changer l'avatar de ${list.name}`}
          onPick={(emoji) => act(model.updateList, list.id, { emoji })}
        >
          <Avatar name={list.name} emoji={list.emoji} everyone={everyone} />
        </EmojiPicker>
        <div className="card-title">
          <h2>
            <Editable
              value={list.name}
              label="Renommer la liste"
              onSave={(name) => act(model.updateList, list.id, { name })}
            />
          </h2>
          <span className="count">
            {total === 0
              ? "Liste vide"
              : complete
                ? "✓ Complet"
                : `${done} / ${total}`}
          </span>
        </div>
        <div className="card-tools">
          {canMoveLeft && (
            <button
              type="button"
              className="ghost"
              title="Déplacer avant"
              aria-label={`Déplacer ${list.name} avant`}
              onClick={() => act(model.moveList, list.id, -1)}
            >
              ←
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              className="ghost"
              title="Déplacer après"
              aria-label={`Déplacer ${list.name} après`}
              onClick={() => act(model.moveList, list.id, 1)}
            >
              →
            </button>
          )}
          {confirming ? (
            <button
              type="button"
              className="danger small"
              onClick={() => act(model.removeList, list.id)}
              onBlur={() => setConfirming(false)}
              autoFocus
            >
              Supprimer ?
            </button>
          ) : (
            <button
              type="button"
              className="ghost"
              title="Supprimer la liste"
              aria-label={`Supprimer la liste ${list.name}`}
              onClick={() => setConfirming(true)}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <div className="bar" aria-hidden="true">
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      <ul className="items">
        {list.items.map((item) => (
          <li key={item.id} className={item.done ? "done" : ""}>
            <label className="check">
              <input
                type="checkbox"
                checked={item.done}
                aria-label={item.text}
                onChange={(e) =>
                  act(model.updateItem, list.id, item.id, {
                    done: e.target.checked,
                  })
                }
              />
              <span className="box" aria-hidden="true" />
            </label>
            <Editable
              value={item.text}
              label="Modifier l'élément"
              className="item-text"
              multiline
              onSave={(text) =>
                act(model.updateItem, list.id, item.id, { text })
              }
            />
            <button
              type="button"
              className="ghost remove"
              aria-label={`Retirer ${item.text}`}
              title="Retirer"
              onClick={() => act(model.removeItem, list.id, item.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form className="add" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            everyone
              ? "Ajouter pour tout le monde…"
              : `Ajouter pour ${list.name}…`
          }
          aria-label={`Ajouter à la liste ${list.name}`}
        />
        <button type="submit" aria-label="Ajouter" disabled={!draft.trim()}>
          +
        </button>
      </form>
      {complete && (
        <span className="stamp" aria-hidden="true">
          Prêt !
        </span>
      )}
    </article>
  );
}
