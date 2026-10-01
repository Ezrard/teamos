import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "TASK.IO – Gestion d'équipe intelligente",
  description: "La plateforme tout-en-un pour gérer projets, tâches, planning et congés de votre équipe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-background text-foreground font-inter">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
