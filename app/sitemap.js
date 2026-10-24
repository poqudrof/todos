import { SITE_URL } from "../lib/site.js";

export const dynamic = "force-static";

export default function sitemap() {
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
