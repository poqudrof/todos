// Public address used for canonical links, the sitemap and the agent guide.
// A fork hosted elsewhere sets NEXT_PUBLIC_SITE_URL at build time.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://todos.jeremy-laviole.fr"
).replace(/\/+$/, "");
export const SITE_NAME = "Todos";
export const SITE_TITLE =
  "Todos — Qui apporte quoi ? Listes à cocher pour chaque évènement";
export const SITE_DESCRIPTION =
  "Des listes à cocher par personne et pour tout le monde : valises, fêtes, week-ends. Gratuit, sans compte, tout reste dans le navigateur. Pilotable par un assistant IA.";
