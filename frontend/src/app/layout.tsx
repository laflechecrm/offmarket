import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Off Market Reprise",
  description: "Sourcing et acquisition d'entreprises B2B off-market en France",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background">
        <Nav />
        <main>{children}</main>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
