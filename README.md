# Todos — De jolies listes à afficher

Des listes à imprimer et à afficher à la maison : une liste simple, ou une liste de listes (une par personne, par pièce, par rayon…). On choisit un décor, on règle la mise en page et on télécharge un PDF A4 soigné. Site : https://todos.jeremy-laviole.fr/

Tout se passe dans le navigateur : pas de compte, pas de serveur. Chaque modification est enregistrée automatiquement dans le `localStorage` de l’appareil. Pour garder une copie ou changer d’appareil : « Exporter mes listes (JSON) » en bas de l’accueil (ou ⬇ JSON sur une liste), puis « Importer un JSON » ; une liste déjà présente (même identifiant) est remplacée. Le bouton 🔗 Lien donne aussi une adresse qui contient toute la liste (après le `#`).

## Le PDF

- Décors : Fête, Voyage, Plage, Jardin, Hiver, Douceur (guirlande de fanions) et Classique (double cadre fin).
- Mise en page : tout sur une page (cartes en colonnes, liste « Tout le monde » en tête), une page par liste (gros texte, pour la chambre de chacun), ou les deux.
- Portrait ou paysage, cases carrées ou rondes, 0 à 8 lignes vides par liste pour écrire à la main.
- La taille du texte s’ajuste pour remplir la page sans couper les mots ; une liste trop longue continue sur une page suivante.
- Emojis en couleur (dessinés par le système), polices Fredoka et Nunito intégrées.

## Exemples

Six exemples sont proposés sur l’accueil, avec leur PDF : week-end chez Mamie, routine du matin, courses de la semaine, qui fait quoi à la maison, valise pour la mer, anniversaire. Leur texte est dans `lib/examples.js` ; `npm run exemples` régénère les PDF et les miniatures dans `public/exemples/` (miniatures avec Ghostscript, emojis avec sharp).

## Format texte

Le bouton ✍️ Texte et le champ « Nouvelle liste » acceptent :

```
# 🧳 Week-end chez Mamie
## Ce qu'on met dans la voiture
@theme voyage
@pages une            (une | chacun | les-deux)
@orientation portrait (portrait | paysage)
@lignes 2
@cases carrees        (carrees | rondes)

Parents : Lit bébé, tapis, habits, couches, trousse de toilette
Achille 🦁 : Sac avec doudou
Lily 🐰 :
- Sac avec doudou
Enfants : 3 jeux de société et 4 livres chacun
```

`Nom :` commence une liste ; éléments séparés par des virgules ou des lignes ; tout peut tenir sur une ligne. Les lignes `@…` sont facultatives.

## Sans navigateur

```sh
npm run pdf -- ma-liste.txt -o ma-liste.pdf
```

Fabrique le PDF d’un fichier au format texte, avec le même code que le site. Pratique pour un agent (Claude Code…) qui prépare des listes. Dans la page, `window.todos` (`todos.help()`) permet aussi de piloter le site par script ; rien n’est affiché à ce sujet.

## Développement

Node.js 20.9 minimum.

```sh
npm install
npm run dev     # http://127.0.0.1:3000
npm test
npm run build   # site statique dans out/
```

- `lib/model.js` : listes et réglages (fonctions pures).
- `lib/format.js` : format texte. `lib/link.js` : liens de partage.
- `lib/pdf.js` : mise en page et dessin du PDF (pdf-lib), navigateur et Node. `lib/pdf-browser.js` : polices et emojis côté navigateur.
- `lib/store.js` : stockage local. `lib/backup.js` : export et import JSON. `lib/examples.js` : exemples.
- `app/` : interface Next.js (export statique).

Polices : Fredoka et Nunito, licence SIL Open Font License, dans `public/fonts/`.

## Déploiement

Chaque push sur `main` teste, construit et publie sur GitHub Pages (`.github/workflows/deploy-pages.yml`). Domaine : `public/CNAME` et `lib/site.js` ; DNS : `CNAME todos → poqudrof.github.io.`
