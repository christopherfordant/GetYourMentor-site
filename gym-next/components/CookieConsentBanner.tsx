"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CONSENT_KEY = "gym-cookie-consent-v1";

export function CookieConsentBanner({ preferencesTarget }: { preferencesTarget?: HTMLElement | null } = {}) {
  const [visible, setVisible] = useState<boolean | null>(null);
  const openedFromPreference = useRef(false);
  useEffect(() => {
    if (visible === false && openedFromPreference.current) {
      (preferencesTarget ?? document).querySelector<HTMLButtonElement>(".cookie-preferences-trigger")?.focus();
      openedFromPreference.current = false;
    }
  }, [visible, preferencesTarget]);

  useEffect(() => {
    setVisible(window.localStorage.getItem(CONSENT_KEY) === null);
  }, []);

  function saveChoice(choice: "essential" | "refused") {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);
  }

  if (visible === null) return null;

  if (!visible) {
    const preferenceButton = (
      <button
        type="button"
        className="cookie-preferences-trigger"
        onClick={() => { openedFromPreference.current = true; setVisible(true); }}
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="cookie-consent-banner"
      >
        Préférences cookies
      </button>
    );
    return preferencesTarget ? createPortal(preferenceButton, preferencesTarget) : preferenceButton;
  }

  return (
    <aside
      id="cookie-consent-banner"
      className="cookie-consent-banner"
      role="region"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      aria-live="polite"
    >
      <div>
        <strong id="cookie-consent-title">Votre confidentialité compte</strong>
        <p id="cookie-consent-description">
          GetYourMentor utilise uniquement les éléments nécessaires à la session et à la sécurité. Aucun outil de mesure d’audience
          n’est activé sans votre choix. <a href="/legal/cookies">En savoir plus</a>
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-secondary" onClick={() => saveChoice("refused")}>Refuser le non nécessaire</button>
        <button type="button" className="cookie-consent-primary" onClick={() => saveChoice("essential")}>Continuer avec le nécessaire</button>
      </div>
    </aside>
  );
}
