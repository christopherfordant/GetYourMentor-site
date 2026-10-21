"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CONSENT_KEY = "gym-cookie-consent-v1";

export function CookieConsentBanner({ preferencesTarget }: { preferencesTarget?: HTMLElement | null } = {}) {
  const [visible, setVisible] = useState<boolean | null>(null);
  const openedFromPreference = useRef(false);
  const bannerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!visible || !bannerRef.current) return;
    const banner = bannerRef.current;
    const reserveSpace = () => {
      const bounds = banner.getBoundingClientRect();
      const bottom = Math.max(0, parseFloat(getComputedStyle(banner).bottom) || 0);
      document.documentElement.style.setProperty("--cookie-banner-space", `${Math.ceil(bounds.height + bottom + 8)}px`);
    };
    reserveSpace();
    const observer = new ResizeObserver(reserveSpace);
    observer.observe(banner);
    window.addEventListener("resize", reserveSpace);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reserveSpace);
      document.documentElement.style.removeProperty("--cookie-banner-space");
    };
  }, [visible, preferencesTarget]);
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
      ref={bannerRef}
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
