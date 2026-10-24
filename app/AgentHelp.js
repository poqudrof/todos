"use client";

import { useEffect, useState } from "react";
import { eventToText } from "../lib/format.js";
import { THEMES } from "../lib/themes.js";

// Prompt to paste into ChatGPT, Claude, Le Chat… so that the assistant
// answers with a link that opens the lists in this app.
export function buildPrompt(base, event) {
  const current = event
    ? `\n\nVoici mes listes actuelles, à compléter ou modifier selon ce que je te demande :\n\n${eventToText(event)}\n`
    : "";
  return `Tu m'aides à préparer des listes à cocher avec l'application Todos (${base}).

Écris les listes dans ce format texte :

# <emoji> <nom de l'évènement>
@theme <${THEMES.map((t) => t.id).join("|")}>
@date AAAA-MM-JJ   (facultatif)

Tout le monde :
- élément commun à tous
<Prénom ou groupe> <emoji facultatif> :
- élément
- [x] élément déjà prêt

Une liste par personne ou par groupe (Parents, Enfants…), « Tout le monde » pour ce qui est commun.${
    event
      ? ` Garde la ligne @id ${event.id} pour mettre à jour ma liste au lieu d'en créer une autre.`
      : ""
  }

Réponds avec :
1. un lien cliquable : ${base}#liste= suivi du texte encodé avec encodeURIComponent (espaces en %20, retours à la ligne en %0A, deux-points en %3A) ;
2. le texte brut dans un bloc de code, que je pourrai coller dans l'app si le lien ne marche pas.${current}

Ma demande : `;
}

export default function AgentHelp({ event, notify }) {
  const [base, setBase] = useState("");
  useEffect(
    () => setBase(window.location.href.split("#")[0].split("?")[0]),
    [],
  );

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("Copie impossible : sélectionnez le texte à la main.");
    }
  };

  const prompt = buildPrompt(base, event);
  const guide = `${base}llms.txt`;

  return (
    <div className="agent-help">
      <h2>🤖 Piloter avec une IA</h2>
      <div className="agent-grid">
        <div>
          <h3>Avec un assistant (ChatGPT, Claude, Le Chat…)</h3>
          <ol>
            <li>Copiez la consigne et collez-la dans la conversation.</li>
            <li>
              Ajoutez votre demande : « week-end chez Mamie avec Achille et
              Lily, 2 nuits ».
            </li>
            <li>
              Ouvrez le lien qu’il vous donne, ou collez son texte{" "}
              {event ? "dans ✍️ Texte" : "dans « Nouvel évènement »"}.
            </li>
          </ol>
          <button
            type="button"
            className="primary"
            onClick={() =>
              copy(prompt, "Consigne copiée, collez-la dans votre assistant.")
            }
          >
            📋 Copier la consigne{event ? " (avec cette liste)" : ""}
          </button>
        </div>
        <div>
          <h3>Avec un agent qui pilote le navigateur</h3>
          <p>
            La page expose <code>window.todos</code> : <code>todos.help()</code>{" "}
            liste les commandes (créer, ajouter, cocher, partager…). Le format
            et l’API sont décrits dans{" "}
            <a href={guide} target="_blank" rel="noreferrer">
              llms.txt
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() =>
              copy(
                `Ouvre ${base} et utilise window.todos (todos.help() pour la liste des commandes) pour `,
                "Consigne copiée.",
              )
            }
          >
            📋 Copier une consigne d’agent
          </button>
        </div>
      </div>
    </div>
  );
}
