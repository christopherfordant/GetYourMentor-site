"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { BackToTopButton } from "./BackToTopButton";

export function FooterUtilities() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => setTarget(document.querySelector<HTMLElement>("[data-footer-utilities]"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return <><CookieConsentBanner preferencesTarget={target} />{target ? createPortal(<BackToTopButton />, target) : <BackToTopButton />}</>;
}

export function FooterUtilitySlot() {
  return <div className="footer-utilities" data-footer-utilities role="group" aria-label="Préférences et navigation" />;
}
