import { useId } from "react";

export function EmailIcon() {
  return <svg className="auth-provider-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m4 6 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}

export function UnavailableGoogleButton() {
  const noteId=useId();
  return <div className="auth-provider-presentation"><button className="auth-provider-google" type="button" disabled aria-describedby={noteId}><img src="/images/demo-sport.svg" width="20" height="20" alt="" aria-hidden="true"/><span>Continuer avec Google</span></button><p id={noteId}>Connexion Google indisponible pour le moment. Utilise ton adresse email.</p></div>;
}
