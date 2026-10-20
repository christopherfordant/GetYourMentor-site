"use client";

import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <a className={`back-to-top${visible ? " is-visible" : ""}`} href="#top" aria-label="Remonter en haut de la page" aria-hidden={!visible} tabIndex={visible ? 0 : -1} onClick={event => { event.preventDefault(); window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12 19V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>;
}
