"use client";

import { useState } from "react";
import * as model from "../lib/model.js";
import * as store from "../lib/store.js";
import { docToText, parseText, splitEmoji } from "../lib/format.js";
import { shareUrl } from "../lib/link.js";
import { getTheme } from "../lib/themes.js";
import { backupJson } from "../lib/backup.js";
import { docFileName, downloadJson } from "../lib/download.js";
import ListCard from "./ListCard.js";
import PrintPanel from "./PrintPanel.js";
import {
  DOC_EMOJIS,
  Editable,
  EmojiPicker,
  Garland,
  themeStyle,
} from "./ui.js";

export default function DocView({ doc, id, notify }) {
  const [panel, setPanel] = useState(null);
  const [text, setText] = useState("");
  const [newList, setNewList] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!doc) {
    return (
      <main className="page missing">
        <a href="#" className="back">
          ← Mes listes
        </a>
        <h1>Cette liste n’est pas sur cet appareil</h1>
        <p>
          Les listes restent dans le navigateur où elles ont été créées. Pour en
          recevoir une, demandez son lien de partage.
        </p>
        <p className="muted">Identifiant : {id}</p>
      </main>
    );
  }

  const theme = getTheme(doc.theme);
  const lists = model.sortedLists(doc);
  const colors = model.listColors(doc, theme);
  const others = lists.filter((list) => !model.isEveryone(list));
  const hasEveryone = lists.length > others.length;

  const act = (fn, ...args) => {
    try {
      store.change(doc.id, fn, ...args);
    } catch (error) {
      notify(error.message);
    }
  };

  const togglePanel = (name) => {
    if (name === "text") setText(docToText(doc));
    setPanel(panel === name ? null : name);
  };

  const share = async () => {
    const url = shareUrl(doc, window.location.href.split("#")[0]);
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien copié : il contient toute la liste.");
    } catch {
      setText(url);
      setPanel("link");
    }
  };

  const addList = (e) => {
    e.preventDefault();
    if (!newList.trim()) return;
    act(model.addList, splitEmoji(newList));
    setNewList("");
  };

  const replaceFromText = () => {
    const parsed = parseText(text);
    const previous = doc;
    store.saveDoc(
      model.createDoc({
        ...parsed,
        id: doc.id,
        createdAt: doc.createdAt,
        title: parsed.title || doc.title,
        emoji: parsed.title ? parsed.emoji : doc.emoji,
        theme: parsed.theme || doc.theme,
        pdf: { ...doc.pdf, ...parsed.pdf },
      }),
    );
    setPanel(null);
    notify("Listes remplacées.", {
      label: "Annuler",
      run: () => store.saveDoc(previous),
    });
  };

  const duplicate = () => {
    const copy = model.createDoc({
      ...doc,
      id: undefined,
      title: `${doc.title} (copie)`,
    });
    store.saveDoc(copy);
    window.location.hash = `/${copy.id}`;
  };

  const remove = () => {
    store.deleteDoc(doc.id);
    window.location.hash = "";
    notify(`« ${doc.title} » supprimé.`, {
      label: "Annuler",
      run: () => store.saveDoc(doc),
    });
  };

  return (
    <main className="doc" style={themeStyle(theme)}>
      <Garland colors={theme.flags} />

      <nav className="topbar">
        <a href="#" className="back">
          ← Mes listes
        </a>
        <div className="actions">
          <button
            type="button"
            onClick={() => togglePanel("text")}
            aria-expanded={panel === "text"}
          >
            ✍️ Texte
          </button>
          <button type="button" onClick={share}>
            🔗 Lien
          </button>
          <button type="button" onClick={duplicate}>
            📄 Dupliquer
          </button>
          <button
            type="button"
            title="Exporter cette liste en JSON"
            onClick={() =>
              downloadJson(backupJson([doc]), docFileName(doc, "json"))
            }
          >
            ⬇ JSON
          </button>
          {confirmDelete ? (
            <button
              type="button"
              className="danger"
              onClick={remove}
              onBlur={() => setConfirmDelete(false)}
              autoFocus
            >
              Oui, supprimer
            </button>
          ) : (
            <button
              type="button"
              className="danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              🗑️
            </button>
          )}
        </div>
      </nav>

      <div className="workspace">
        <section className="editor" aria-label="Listes">
          <header className="doc-head">
            <EmojiPicker
              value={doc.emoji}
              choices={DOC_EMOJIS}
              label="Changer l’emoji du titre"
              onPick={(emoji) => act(model.updateDoc, { emoji })}
            >
              <span className="doc-emoji">{doc.emoji || "＋"}</span>
            </EmojiPicker>
            <div>
              <h1>
                <Editable
                  value={doc.title}
                  label="Renommer"
                  onSave={(title) => title && act(model.updateDoc, { title })}
                />
              </h1>
              <p className="subtitle">
                <Editable
                  value={doc.subtitle}
                  placeholder="Ajouter un sous-titre"
                  label="Sous-titre"
                  onSave={(subtitle) => act(model.updateDoc, { subtitle })}
                />
              </p>
            </div>
          </header>

          {panel === "text" && (
            <section className="card panel" aria-label="Modifier en texte">
              <h2>✍️ Écrire en texte</h2>
              <p className="muted">
                Une ligne <code>Nom : élément, élément</code> par liste, ou un
                élément par ligne sous <code>Nom :</code>. <code>#</code> pour
                le titre, <code>##</code> pour le sous-titre.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                spellCheck={false}
                aria-label="Texte des listes"
              />
              <div className="row">
                <button
                  type="button"
                  className="primary"
                  onClick={replaceFromText}
                >
                  Remplacer les listes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    act(model.mergeInto, parseText(text));
                    setPanel(null);
                  }}
                >
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
            <section className="card panel" aria-label="Lien de partage">
              <h2>🔗 Lien</h2>
              <p className="muted">
                Copiez ce lien pour retrouver la liste sur un autre appareil.
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

          <div className="cards">
            {lists.map((list) => {
              const index = others.indexOf(list);
              return (
                <ListCard
                  key={list.id}
                  list={list}
                  color={colors.get(list.id)}
                  act={act}
                  round={doc.pdf.boxes === "rondes"}
                  canMoveUp={index > 0}
                  canMoveDown={index >= 0 && index < others.length - 1}
                />
              );
            })}

            <form className="card new-card" onSubmit={addList}>
              <h2>{lists.length ? "Ajouter une liste" : "Première liste"}</h2>
              <p className="muted">Une personne, une pièce, un rayon…</p>
              <div className="add">
                <input
                  value={newList}
                  onChange={(e) => setNewList(e.target.value)}
                  placeholder="Lily, Parents, Fruits & légumes…"
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
              {!hasEveryone && lists.length > 0 && (
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    act(model.addList, { name: model.EVERYONE_NAME })
                  }
                >
                  🌟 Ajouter une liste « Tout le monde »
                </button>
              )}
            </form>
          </div>
        </section>

        <PrintPanel doc={doc} act={act} notify={notify} />
      </div>
    </main>
  );
}
