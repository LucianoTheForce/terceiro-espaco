import type { Metadata } from "next";
import "./globals.css";
import "./stories.css";
import "./portrait.css";
import "./remote.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl =
  process.env.SITE_URL ||
  (productionHost ? `https://${productionHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Terceiro Espaço",
  description:
    "Um novo centro cultural na Barra Funda. Arte, design, música e presença se encontram em 720 m² de possibilidades. Uma iniciativa VERSA, The Force e Garupa.",
  openGraph: {
    title: "Terceiro Espaço",
    description: "Entre a casa e o trabalho, existe um lugar para pertencer.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/media/espaco.jpg", width: 1920, height: 1280 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
