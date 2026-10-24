# Todos — Qui apporte quoi ?

Listes à cocher pour un évènement : une liste par personne ou par groupe, plus une liste « Tout le monde ». Décors au choix (fête, voyage, plage, nature, hiver, douceur), guirlande, compte à rebours et confettis quand une liste est complète. Site en ligne : https://todos.jeremy-laviole.fr/

Tout se passe dans le navigateur : pas de compte, pas de serveur. Les évènements sont enregistrés dans le `localStorage` de l’appareil, et le bouton 🔗 Partager crée un lien qui contient toute la liste (après le `#`, donc jamais envoyé à un serveur).

## Démarrer

Node.js 20.9 minimum.

```sh
npm install
npm run dev     # http://127.0.0.1:3000
npm test
npm run build   # site statique dans out/
```

## Format texte

Le même format sert à la saisie, aux assistants IA et aux liens :

```
# 🧳 Week-end chez Mamie
@theme voyage
@date 2026-11-14

Parents : Lit bébé, tapis, habits, couches, trousse de toilette
Achille 🦁 : Sac avec doudou
Lily 🐰 : Sac avec doudou
Enfants : 3 jeux de société et 4 livres chacun
Tout le monde :
- Pique-nique
- [x] Crème solaire
```

`Nom :` commence une liste, les éléments sont séparés par des virgules ou des lignes, `[x]` coche. Tout peut tenir sur une ligne. Détails dans `public/llms.txt`.

## Piloter avec un agent IA

- **Assistant de conversation** (ChatGPT, Claude, Le Chat…) : le bouton 🤖 IA copie une consigne. L’assistant répond par un lien `https://todos.jeremy-laviole.fr/#liste=<texte encodé>` qui ouvre et enregistre la liste. Un lien qui garde la ligne `@id` met à jour la liste existante (avec annulation possible).
- **Agent qui pilote le navigateur** (Claude in Chrome…) : la page expose `window.todos` (`todos.help()`) pour créer, ajouter, cocher, déplacer, partager. La page n’ouvre jamais de boîte de dialogue native.
- **Guide pour agents** : `/llms.txt`, lié depuis l’en-tête de la page.

## Code

- `lib/model.js` : opérations sur un évènement (fonctions pures, testées).
- `lib/format.js` : lecture et écriture du format texte.
- `lib/link.js` : liens de partage.
- `lib/store.js` : stockage `localStorage`, synchronisé entre onglets.
- `lib/agent.js` : API `window.todos`.
- `app/` : interface Next.js (export statique).

## Déploiement

Chaque push sur `main` teste, construit et publie sur GitHub Pages (`.github/workflows/deploy-pages.yml`). Le domaine vient de `public/CNAME` et de `lib/site.js` ; DNS : enregistrement `CNAME todos → poqudrof.github.io.`
