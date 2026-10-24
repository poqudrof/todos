import "./globals.css";
import { Fredoka, Nunito } from "next/font/google";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "../lib/site.js";

const titleFont = Fredoka({ subsets: ["latin"], variable: "--font-title" });
const bodyFont = Nunito({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  metadataBase: new URL("/", SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Jeremy Laviole" }],
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport = { themeColor: "#fff4e6" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${titleFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
