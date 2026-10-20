import Link from "next/link";

type ProductionUnavailableProps = {
  title: string;
  description: string;
};

export function ProductionUnavailable({ title, description }: ProductionUnavailableProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background: "#09111f",
        color: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(100%, 620px)",
          padding: "40px",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: "24px",
          background: "#121d31",
          boxShadow: "0 24px 70px rgba(0,0,0,.24)",
        }}
      >
        <p style={{ margin: "0 0 12px", color: "#c8f45b", fontWeight: 700 }}>GetYourMentor</p>
        <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05 }}>{title}</h1>
        <p style={{ margin: "0 0 28px", color: "#c3ccda", lineHeight: 1.6 }}>{description}</p>
        <Link
          href="/recherche"
          style={{
            display: "inline-flex",
            padding: "13px 18px",
            borderRadius: "12px",
            background: "#c8f45b",
            color: "#08111d",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Revenir à la recherche
        </Link>
      </section>
    </main>
  );
}
