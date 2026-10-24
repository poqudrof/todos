"use client";

import { useState } from "react";
import * as model from "../lib/model.js";
import { Avatar, Editable, EmojiPicker, LIST_EMOJIS } from "./ui.js";

export default function ListCard({
  list,
  color,
  act,
  canMoveUp,
  canMoveDown,
  round,
}) {
  const everyone = model.isEveryone(list);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);

  const add = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    act(model.addItems, list.id, draft);
    setDraft("");
  };

  return (
    <article
      className={`card list-card ${everyone ? "everyone" : ""}`}
      style={{ "--list": color }}
      aria-label={`Liste ${list.name}`}
    >
      <header className="card-head">
        <EmojiPicker
          value={list.emoji}
          choices={LIST_EMOJIS}
          label={`Changer l’emoji de ${list.name}`}
          onPick={(emoji) => act(model.updateList, list.id, { emoji })}
        >
          <Avatar
            name={list.name}
            emoji={list.emoji || (everyone ? "🌟" : "")}
            color={color}
          />
        </EmojiPicker>
        <h2>
          <Editable
            value={list.name}
            label="Renommer la liste"
            onSave={(name) => act(model.updateList, list.id, { name })}
          />
        </h2>
        <div className="card-tools">
          {canMoveUp && (
            <button
              type="button"
              className="ghost"
              title="Monter la liste"
              aria-label={`Monter ${list.name}`}
              onClick={() => act(model.moveList, list.id, -1)}
            >
              ↑
            </button>
          )}
          {canMoveDown && (
            <button
              type="button"
              className="ghost"
              title="Descendre la liste"
              aria-label={`Descendre ${list.name}`}
              onClick={() => act(model.moveList, list.id, 1)}
            >
              ↓
            </button>
          )}
          {confirming ? (
            <button
              type="button"
              className="danger small"
              autoFocus
              onClick={() => act(model.removeList, list.id)}
              onBlur={() => setConfirming(false)}
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

      <ul className="items">
        {list.items.map((item, index) => (
          <li key={item.id}>
            <span
              className={`mark ${round ? "round" : ""}`}
              aria-hidden="true"
            />
            <Editable
              value={item.text}
              label="Modifier l’élément"
              className="item-text"
              onSave={(text) => act(model.updateItem, list.id, item.id, text)}
            />
            <span className="item-tools">
              <button
                type="button"
                className="ghost"
                disabled={index === 0}
                aria-label={`Monter ${item.text}`}
                title="Monter"
                onClick={() => act(model.moveItem, list.id, item.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="ghost"
                disabled={index === list.items.length - 1}
                aria-label={`Descendre ${item.text}`}
                title="Descendre"
                onClick={() => act(model.moveItem, list.id, item.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="ghost"
                aria-label={`Retirer ${item.text}`}
                title="Retirer"
                onClick={() => act(model.removeItem, list.id, item.id)}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>

      <form className="add" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter… (plusieurs : séparez par des virgules)"
          aria-label={`Ajouter à la liste ${list.name}`}
        />
        <button type="submit" aria-label="Ajouter" disabled={!draft.trim()}>
          +
        </button>
      </form>
    </article>
  );
}
