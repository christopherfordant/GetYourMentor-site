"use client";
import { SiteFooter } from "@/components/SiteFooter";

import { useRef, useState } from "react";
import { FormRejection, readFormData } from "@/lib/access-form-response";
import { nextRoutes } from "@/lib/next-routes";
import { LanguageSelector } from "@/components/common/LanguageSelector";

type InscriptionClubLegacyPageProps = {
  legacyStyles: string;
  params: Record<string, string | undefined>;
};

function ClubSignupHeader() {
  return (
    <header className="topbar topbar-light">
      <div className="brand-lockup">
        <a className="brand-name brand-link" href={nextRoutes.home}>GetYourMentor</a>
      </div>

      <nav className="sports-nav" aria-label="Sports">
        <a className="sport-link" href={`${nextRoutes.search}?sport=football`}>Football</a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=basketball`}>Basketball</a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Fitness</a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=sports-de-combat`}>Sports de combat</a>
      </nav>

      <div className="topbar-actions">
        <LanguageSelector />
        <a className="account-button" href={nextRoutes.account}>
          <span className="account-button-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 19c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span>Mon compte</span>
        </a>
      </div>
    </header>
  );
}

function ClubSignupVisual() {
  return (
    <section className="club-signup-visual" aria-label="Identité GYM">
      <div className="club-signup-logo-frame">
        <img src="/images/demo-sport.svg" alt="Logo GYM GetYourMentor" />
      </div>
    </section>
  );
}

function ClubSignupForm() {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [succeeded,setSucceeded] = useState(false);
  const lock=useRef(false);
  const [fileErrors,setFileErrors]=useState<Record<string,string>>({});
  const [locationStatus, setLocationStatus] = useState("");
  const [coordinates, setCoordinates] = useState({ latitude: "", longitude: "" });

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setLocationStatus("Recherche de la position de la structure…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) });
        setLocationStatus("Position enregistrée. Elle servira à la recherche locale.");
      },
      () => setLocationStatus("Position indisponible. Renseignez au moins la ville ou l’adresse."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <section className="club-signup-form-panel">
      <div className="club-signup-form-card">
        <h1>Votre structure, votre équipe</h1>
        <p id="club-required" className="auth-helper">Les champs marqués * sont obligatoires. Les autres sont facultatifs. En démonstration, utilisez des coordonnées et des fichiers fictifs : aucun compte ni paiement bancaire n’est créé ici.</p>
        <form className="auth-form gym-access-form" aria-describedby="club-required club-feedback" aria-busy={submitting}
          onSubmit={async (event) => {
            event.preventDefault();
            if(lock.current||succeeded)return;
            const form=new FormData(event.currentTarget);
            const errors:Record<string,string>={};
            for(const name of ["logo","identity"]){const f=form.get(name);if(f instanceof File&&f.size>5*1024*1024)errors[name]="Le fichier doit peser au maximum 5 Mo.";}
            setFileErrors(errors);if(Object.keys(errors).length){setStatus("Vérifiez les fichiers indiqués.");return;}
            lock.current=true;setSubmitting(true);setStatus("");
            try {
              const response=await fetch("/api/clubs/leads",{method:"POST",body:form,signal:AbortSignal.timeout(15000)});
              const data=await readFormData(response);
              if(typeof data.id!=="string"||!data.id||data.status!=="pending"||data.email!==String(form.get("email")).trim().toLowerCase()||data.clubName!==String(form.get("clubName")).trim()||data.managerName!==String(form.get("managerName")).trim())throw new Error("Unconfirmed lead");
              setSucceeded(true);setStatus("Votre demande a été enregistrée. Aucun compte n’a été créé à cette étape.");
            }catch(error){setStatus(error instanceof FormRejection?error.message:"Résultat non confirmé. Ne renvoyez pas immédiatement la demande : vérifiez d’abord si elle a été enregistrée.");}
            finally{lock.current=false;setSubmitting(false);}

          }}
        >
        <div className="club-signup-grid">
          <label className="auth-field">
            <span>* Nom du club / structure</span>
            <input disabled={submitting||succeeded} name="clubName" type="text" autoComplete="organization" maxLength={512} placeholder="Nom du club / structure" required />
          </label>

          <label className="auth-field">
            <span>* Nom du responsable</span>
            <input disabled={submitting||succeeded} name="managerName" type="text" autoComplete="name" maxLength={512} placeholder="Nom du responsable" required />
          </label>

          <label className="auth-field club-signup-grid-wide">
            <span>* Adresse mail</span>
            <input disabled={submitting||succeeded} name="email" type="email" autoComplete="email" maxLength={320} placeholder="Adresse mail" required />
          </label>

          <label className="auth-field">
            <span>Numéro de téléphone</span>
            <input disabled={submitting||succeeded} name="phone" type="tel" autoComplete="tel" maxLength={512} placeholder="Numéro de téléphone" />
          </label>

          <label className="auth-field club-signup-grid-wide">
            <span>Ville / adresse de la structure</span>
            <input disabled={submitting||succeeded} name="addressLabel" type="text" autoComplete="street-address" placeholder="Ville, quartier ou adresse" maxLength={512} />
          </label>
        </div>

        <input type="hidden" name="latitude" value={coordinates.latitude} />
        <input type="hidden" name="longitude" value={coordinates.longitude} />
        <div className="auth-field">
          <span>Localiser la structure</span>
          <button className="auth-secondary" type="button" onClick={useCurrentLocation}>Utiliser ma position</button>
          <small>La position exacte reste privée et sert uniquement à la recherche de proximité.</small>
          {locationStatus ? <p role="status">{locationStatus}</p> : null}
        </div>

        <label className="auth-field club-signup-upload">
          <span>Logo du club / structure</span>
          <div className="club-signup-dropzone"><input disabled={submitting||succeeded} name="logo" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!fileErrors.logo} aria-describedby="logo-help logo-error" onChange={()=>setFileErrors(current=>({...current,logo:""}))} /></div>
        </label>

        <p id="logo-help" className="auth-helper">Logo : JPEG, PNG ou WebP, 5 Mo maximum.</p><p id="logo-error" role="alert" hidden={!fileErrors.logo}>{fileErrors.logo}</p>
        <label className="auth-field club-signup-upload">
          <span>Pièce d&apos;identité</span>
          <div className="club-signup-dropzone"><input disabled={submitting||succeeded} name="identity" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-invalid={!!fileErrors.identity} aria-describedby="identity-help identity-error" onChange={()=>setFileErrors(current=>({...current,identity:""}))} /></div>
        </label>

        <p id="identity-help" className="auth-helper">Identité : PDF, JPEG, PNG ou WebP, 5 Mo maximum. L’envoi complet est limité à 6 Mo.</p><p id="identity-error" role="alert" hidden={!fileErrors.identity}>{fileErrors.identity}</p>
        <label className="auth-field">
          <span>IBAN (seuls les 4 derniers caractères sont conservés)</span>
          <input disabled={submitting||succeeded} name="iban" className="club-signup-iban" type="text" placeholder="FR76" />
        </label>

          <p role={succeeded ? "status" : "alert"} id="club-feedback" data-club-signup-status hidden={!status}>{status}</p>
          <div className="club-signup-actions">
            <button className="auth-primary club-signup-submit" type="submit" disabled={submitting||succeeded}>
              {submitting ? "Envoi…" : succeeded ? "Demande enregistrée" : "Envoyer ma demande"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function InscriptionClubLegacyPage({ legacyStyles }: InscriptionClubLegacyPageProps) {
  return (
    <>
      <style jsx global>{legacyStyles}</style>
      <div className="site-shell club-signup-shell" id="gym-club-signup">
        <ClubSignupHeader />

        <main className="club-signup-page">
          <ClubSignupVisual />
          <ClubSignupForm />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
