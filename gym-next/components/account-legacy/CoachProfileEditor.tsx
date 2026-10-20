"use client";

import { useState } from "react";

const RADIUS_OPTIONS = [1, 5, 10];

type CoachProfileEditorProps = {
  coachId: string;
  specialty: string;
  city: string;
  priceFrom: number;
  description: string;
  disciplines?: string;
  diplomas?: string;
  sessionTypes?: string;
  availability?: string;
  photoUrl?: string;
  bankAccountLast4?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  gender?: "homme" | "femme";
  practice?: "interieur" | "exterieur";
  level?: "debutant" | "intermediaire" | "confirme";
  format?: "presentiel" | "visio";
  availabilityTags?: Array<"morning" | "afternoon">;
};

export function CoachProfileEditor({ coachId, specialty, city, priceFrom, description, disciplines = "", diplomas = "", sessionTypes = "", availability = "", photoUrl = "", bankAccountLast4 = "", latitude, longitude, serviceRadiusKm = 10, gender = "homme", practice = "interieur", level = "debutant", format = "presentiel", availabilityTags = [] }: CoachProfileEditorProps) {
  const [values, setValues] = useState({ specialty, city, priceFrom: String(priceFrom), description, disciplines, diplomas, sessionTypes, availability, photoUrl, bankAccountLast4, latitude: latitude == null ? "" : String(latitude), longitude: longitude == null ? "" : String(longitude), serviceRadiusKm: String(serviceRadiusKm), gender, practice, level, format, availabilityTags });
  const [status, setStatus] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setLocationStatus("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setValues((current) => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
        setLocationStatus("Position enregistrée. Elle sera utilisée pour la recherche par proximité.");
      },
      () => setLocationStatus("Position indisponible. Autorisez la géolocalisation ou renseignez votre ville."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <section className="account-dashboard-card" id="coach-profile-editor" data-coach-profile-editor>
      <div className="coach-home-card-head">
        <h3>Modifier mon profil</h3>
        <span>Informations visibles par les sportifs</span>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setStatus("");
          const response = await fetch(`/api/coaches/${coachId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, priceFrom: Number(values.priceFrom), latitude: values.latitude === "" ? null : Number(values.latitude), longitude: values.longitude === "" ? null : Number(values.longitude), serviceRadiusKm: Number(values.serviceRadiusKm) }),
          });
          const payload = await response.json();
          setSaving(false);
          setStatus(response.ok ? "Profil mis à jour." : payload.error ?? "Mise à jour impossible");
        }}
      >
        <label className="auth-field"><span>Spécialité</span><input value={values.specialty} onChange={(event) => setValues({ ...values, specialty: event.target.value })} /></label>
        <label className="auth-field"><span>Ville / zone</span><input value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></label>
        <div className="auth-field">
          <span>Zone d’intervention</span>
          <div className="account-inline-actions">
            <button className="auth-secondary" type="button" onClick={useCurrentLocation}>Utiliser ma position</button>
            <select aria-label="Rayon d’intervention" value={values.serviceRadiusKm} onChange={(event) => setValues({ ...values, serviceRadiusKm: event.target.value })}>
              {RADIUS_OPTIONS.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
            </select>
          </div>
          <small>Votre position exacte n’est jamais affichée publiquement ; seule la proximité est utilisée.</small>
          {locationStatus ? <p role="status">{locationStatus}</p> : null}
        </div>
        <label className="auth-field"><span>Tarif à partir de</span><input type="number" min="0" value={values.priceFrom} onChange={(event) => setValues({ ...values, priceFrom: event.target.value })} /></label>
        <label className="auth-field"><span>Présentation</span><textarea value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
        <label className="auth-field"><span>Disciplines</span><input value={values.disciplines} onChange={(event) => setValues({ ...values, disciplines: event.target.value })} placeholder="Ex. basketball, préparation physique" /></label>
        <label className="auth-field"><span>Genre du coach</span><select value={values.gender} onChange={(event) => setValues({ ...values, gender: event.target.value as NonNullable<CoachProfileEditorProps["gender"]> })}><option value="homme">Homme</option><option value="femme">Femme</option></select></label>
        <label className="auth-field"><span>Lieu de pratique</span><select value={values.practice} onChange={(event) => setValues({ ...values, practice: event.target.value as NonNullable<CoachProfileEditorProps["practice"]> })}><option value="interieur">Intérieur</option><option value="exterieur">Extérieur</option></select></label>
        <label className="auth-field"><span>Niveau principal</span><select value={values.level} onChange={(event) => setValues({ ...values, level: event.target.value as NonNullable<CoachProfileEditorProps["level"]> })}><option value="debutant">Débutant</option><option value="intermediaire">Intermédiaire</option><option value="confirme">Confirmé</option></select></label>
        <label className="auth-field"><span>Format</span><select value={values.format} onChange={(event) => setValues({ ...values, format: event.target.value as NonNullable<CoachProfileEditorProps["format"]> })}><option value="presentiel">Présentiel</option><option value="visio">Visio</option></select></label>
        <fieldset className="auth-field"><legend>Disponibilité</legend><label><input type="checkbox" checked={values.availabilityTags.includes("morning")} onChange={(event) => setValues({ ...values, availabilityTags: event.target.checked ? [...values.availabilityTags, "morning"] : values.availabilityTags.filter((tag) => tag !== "morning") })} /> Matin</label><label><input type="checkbox" checked={values.availabilityTags.includes("afternoon")} onChange={(event) => setValues({ ...values, availabilityTags: event.target.checked ? [...values.availabilityTags, "afternoon"] : values.availabilityTags.filter((tag) => tag !== "afternoon") })} /> Après-midi</label></fieldset>
        <label className="auth-field"><span>Diplômes / certifications</span><input value={values.diplomas} onChange={(event) => setValues({ ...values, diplomas: event.target.value })} /></label>
        <label className="auth-field"><span>Types de séances</span><input value={values.sessionTypes} onChange={(event) => setValues({ ...values, sessionTypes: event.target.value })} placeholder="Individuel, duo, visio" /></label>
        <label className="auth-field"><span>Disponibilités basiques</span><input value={values.availability} onChange={(event) => setValues({ ...values, availability: event.target.value })} placeholder="Ex. mardi et jeudi, 18h–21h" /></label>
        <label className="auth-field"><span>Photo de profil (URL)</span><input type="url" value={values.photoUrl} onChange={(event) => setValues({ ...values, photoUrl: event.target.value })} /></label>
        <label className="auth-field"><span>IBAN (prototype, seuls les 4 derniers chiffres sont conservés)</span><input inputMode="numeric" value={values.bankAccountLast4} onChange={(event) => setValues({ ...values, bankAccountLast4: event.target.value })} placeholder="•••• 1234" /></label>
        <button className="auth-primary" type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer le profil"}</button>
        <p role="status" data-coach-profile-status hidden={!status}>{status}</p>
      </form>
    </section>
  );
}
