export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>404</h1>
          <p style={{ color: "#6b7280" }}>Cette page n'existe pas.</p>
          <a href="/" style={{ marginTop: "1rem", color: "#6366f1", textDecoration: "underline" }}>
            Retour à l'accueil
          </a>
        </div>
      </body>
    </html>
  );
}
