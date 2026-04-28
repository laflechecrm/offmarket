import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offmarket Sourcing",
  description: "Identification d'entreprises à reprendre off-market en France",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
