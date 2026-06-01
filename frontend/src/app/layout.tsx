import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Acquisition Finder",
  description: "CRM de sourcing de reprises d'entreprises B2B en France",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">
        <Nav />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
