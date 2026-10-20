"use client";

import { useEffect, useState } from "react";
import { CommissionSettings } from "@/components/account-legacy/CommissionSettings";

type Overview = {
  coaches: number;
  verifiedCoaches: number;
  reservations: number;
  requested: number;
  accepted: number;
  paid: number;
  coachList: Array<{ id: string; name: string; sport: string; city: string; verified: boolean; verificationStatus?: string; profileComplete: boolean }>;
  reservationList: Array<{ id: string; coachName: string; service: string; status: string; price: number }>;
  clubLeads: number;
  pendingClubLeads: number;
  clubLeadList: Array<{ id: string; clubName: string; managerName: string; email: string; createdAt: string; status: string }>;
};

export function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");

  async function openCoachDocument(id: string, kind: "identity" | "diploma") {
    const response = await fetch(`/api/coaches/${encodeURIComponent(id)}/documents?kind=${kind}`);
    const payload = await response.json();
    if (!response.ok || typeof payload.data?.signedUrl !== "string") {
      setError(payload.error ?? "Justificatif indisponible");
      return;
    }
    window.open(payload.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function toggleVerification(id: string, verified: boolean) {
    const response = await fetch(`/api/admin/coaches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Mise à jour impossible");
      return;
    }
    setOverview((current) => current ? { ...current, verifiedCoaches: current.coachList.filter((coach) => coach.id === id ? verified : coach.verified).length, coachList: current.coachList.map((coach) => coach.id === id ? { ...coach, verified } : coach) } : current);
  }

  async function updateClubLeadStatus(id: string, status: string) {
    const response = await fetch("/api/admin/overview", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubLeadId: id, status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Mise à jour impossible");
      return;
    }
    setOverview((current) => current ? { ...current, clubLeadList: current.clubLeadList.map((lead) => lead.id === id ? { ...lead, status: payload.data.status } : lead) } : current);
  }

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Accès admin refusé"))))
      .then((payload) => setOverview(payload.data))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Vue admin indisponible"));
  }, []);

  return (
    <section className="account-dashboard admin-home" data-admin-dashboard>
      <div className="account-dashboard-card">
        <p>Administration MVP</p>
        <h1>Suivi GetYourMentor</h1>
        <p>Contrôlez les coachs référencés et l’activité du parcours de réservation.</p>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <CommissionSettings />
      <section className="account-dashboard-card" data-admin-overview>
        <h2>Vue d’ensemble</h2>
        {overview ? (
          <dl>
            <div><dt>Coachs référencés</dt><dd data-admin-coaches>{overview.coaches}</dd></div>
            <div><dt>Coachs vérifiés</dt><dd data-admin-verified>{overview.verifiedCoaches}</dd></div>
            <div><dt>Demandes à traiter</dt><dd data-admin-requested>{overview.requested}</dd></div>
            <div><dt>Réservations acceptées</dt><dd>{overview.accepted}</dd></div>
            <div><dt>Réservations payées</dt><dd data-admin-paid>{overview.paid}</dd></div>
            <div><dt>Demandes clubs</dt><dd data-admin-club-leads>{overview.clubLeads}</dd></div>
          </dl>
        ) : <p>Chargement des indicateurs...</p>}
      </section>
      {overview ? (
        <>
          <section className="account-dashboard-card" data-admin-coach-list>
            <h2>Coachs</h2>
            {overview.coachList.map((coach) => (
              <article key={coach.id} data-admin-coach={coach.id}>
                <strong>{coach.name}</strong>
                <span>{coach.sport} · {coach.city}</span>
                <span data-admin-coach-completeness>{coach.profileComplete ? "Profil complet" : "Profil incomplet"}</span>
                <span data-admin-coach-status>{coach.verificationStatus === "rejected" ? "Refusé" : coach.verified ? "Vérifié" : "À vérifier"}</span>
                <div className="admin-document-actions">
                  <button type="button" onClick={() => openCoachDocument(coach.id, "identity")}>Voir identité</button>
                  <button type="button" onClick={() => openCoachDocument(coach.id, "diploma")}>Voir diplôme</button>
                </div>
                <button type="button" onClick={() => toggleVerification(coach.id, !coach.verified)}>
                  {coach.verified ? "Retirer la vérification" : "Vérifier"}
                </button>
              </article>
            ))}
          </section>
          <section className="account-dashboard-card" data-admin-reservation-list>
            <h2>Réservations</h2>
            <label className="auth-field">
              <span>Rechercher une réservation</span>
              <input data-admin-reservation-search value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} placeholder="Service ou coach" />
            </label>
            {overview.reservationList.filter((reservation) => `${reservation.service} ${reservation.coachName} ${reservation.status}`.toLowerCase().includes(reservationSearch.toLowerCase())).length === 0 ? <p>Aucune réservation.</p> : overview.reservationList.filter((reservation) => `${reservation.service} ${reservation.coachName} ${reservation.status}`.toLowerCase().includes(reservationSearch.toLowerCase())).map((reservation) => (
              <article key={reservation.id} data-admin-reservation={reservation.id}>
                <strong>{reservation.service}</strong>
                <span>{reservation.coachName} · {reservation.price} EUR</span>
                <span>Statut : {reservation.status}</span>
              </article>
            ))}
          </section>
          <section className="account-dashboard-card" data-admin-club-list>
            <h2>Demandes clubs</h2>
            {overview.clubLeadList.length === 0 ? <p>Aucune demande club.</p> : overview.clubLeadList.map((lead) => (
              <article key={lead.id} data-admin-club-lead={lead.id}>
                <strong>{lead.clubName}</strong>
                <span>{lead.managerName} · {lead.email}</span>
                <label>
                  <span>Statut</span>
                  <select data-admin-club-status value={lead.status} onChange={(event) => updateClubLeadStatus(lead.id, event.target.value)}>
                    <option value="pending">À traiter</option>
                    <option value="contacted">Contacté</option>
                    <option value="closed">Clôturé</option>
                  </select>
                </label>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </section>
  );
}
