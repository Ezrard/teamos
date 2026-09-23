import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "TeamOS – Gestion d'équipe intelligente",
  description: "La plateforme tout-en-un pour gérer projets, tâches, planning et congés de votre équipe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="h-full bg-background text-foreground">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
