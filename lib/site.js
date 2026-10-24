// Public address used for canonical links, the sitemap and the agent guide.
// A fork hosted elsewhere sets NEXT_PUBLIC_SITE_URL at build time.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://todos.jeremy-laviole.fr"
).replace(/\/+$/, "");
export const SITE_NAME = "Todos";
export const SITE_TITLE =
  "Todos — De jolies listes à imprimer et afficher à la maison";
export const SITE_DESCRIPTION =
  "Crée une liste, ou une liste par personne, choisis un décor et télécharge un PDF A4 soigné à afficher : valise, routine, courses, tâches. Gratuit, sans compte.";
