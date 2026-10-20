"use client";

import { useEffect, useState } from "react";

type AccountRole = "sportif" | "coach" | "club" | "admin";
const roleLabels: Record<AccountRole, string> = {
  sportif: "Sportif", coach: "Coach", club: "Structure", admin: "Administration",
};

export function AccountSessionControls({ role, onSignedOut }: { role: AccountRole; onSignedOut: () => void }) {
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Revalidate a cached account after browser back/forward or logout in another tab.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    const changed = (event: StorageEvent) => {
      if (event.key === "gym-session-ended") window.location.replace(`/compte?mode=${role}`);
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("storage", changed);
    setReady(true);
    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("storage", changed);
    };
  }, [role]);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Déconnexion impossible. Réessayez.");
      try { localStorage.setItem("gym-session-ended", String(Date.now())); } catch { /* Cookie deletion still works without storage. */ }
      onSignedOut();
      window.location.replace(`/compte?mode=${role}`);
    } catch {
      setError("Déconnexion impossible. Votre compte reste ouvert. Réessayez.");
      setPending(false);
    }
  }

  return (
    <div className="account-session-controls" data-account-session data-session-ready={ready}>
      <a href="#account-content">Mon compte — {roleLabels[role]}</a>
      <button type="button" onClick={signOut} disabled={pending} aria-busy={pending}>
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
