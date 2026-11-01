import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title:
    "VAZÃO · Encontrar fluxo máximo e corte mínimo em redes dirigidas sintéticas",
  description:
    "Encontrar fluxo máximo e corte mínimo em redes dirigidas sintéticas",
  metadataBase: new URL("https://vazao-gustapaz.starrylinen.chatgpt.site"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "VAZ\u00c3O",
    description:
      "Encontrar fluxo máximo e corte mínimo em redes dirigidas sintéticas",
    type: "website",
    locale: "pt_BR",
  },
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
