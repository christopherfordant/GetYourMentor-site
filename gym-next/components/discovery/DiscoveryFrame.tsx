"use client";

import { SiteFooter } from "@/components/SiteFooter";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";

export const discoverySports = [
  ["football", "Football"], ["basketball", "Basketball"],
  ["metiers-de-la-forme", "Fitness"], ["sports-de-combat", "Sports de combat"],
] as const;

export function DiscoveryFrame({ children, page, demo = false }: { children: ReactNode; page: "search" | "directory" | "profile" | "slot" | "recap"; demo?: boolean }) {
  const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);const panel=useRef<HTMLDivElement>(null);
  useEffect(()=>{const media=window.matchMedia("(min-width: 761px)");const reset=()=>{if(media.matches)setOpen(false);else if(panel.current?.contains(document.activeElement))trigger.current?.focus();};media.addEventListener("change",reset);return()=>media.removeEventListener("change",reset);},[]);
  return <div id="gym-discovery" className={`discovery-editorial${["search", "directory", "profile", "slot", "recap"].includes(page) ? " gym-theme-factory" : ""}`} data-gym-discovery={page}>
    <header className="de-header" id="top" onKeyDown={event=>{if(event.key==="Escape"&&open){setOpen(false);trigger.current?.focus();}}}>
      <a className="de-brand" href={nextRoutes.home} aria-label="GetYourMentor"><b aria-hidden="true">GYM<span>↗</span></b><span>GetYourMentor</span></a>
      <button className="de-menu-toggle" ref={trigger} type="button" aria-label={open?"Fermer le menu":"Menu"} aria-expanded={open} aria-controls="discovery-navigation" onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">{open?"×":"☰"}</span><span className="de-menu-label" aria-hidden="true">{open?"Fermer":"Menu"}</span></button>
      <div className="de-navigation-panel" id="discovery-navigation" ref={panel} data-open={open} onClick={event=>{if((event.target as HTMLElement).closest("a"))setOpen(false);}}>
      <nav className="de-sports" aria-label="Sports">{discoverySports.map(([slug, label]) => <a key={slug} href={buildNextPath(nextRoutes.search, { sport: slug })}>{label}</a>)}</nav>
      <div className="de-actions"><LanguageSelector /><a href={`${nextRoutes.account}?mode=coach`}>Je suis coach</a></div></div><a className="de-account" href={nextRoutes.account}>Mon compte <span aria-hidden="true">↗</span></a>
    </header>
    {demo && <p className="de-demo" role="note">Démonstration · profils, notes et tarifs de test. Aucun paiement réel.</p>}
    {children}
    <SiteFooter />
  </div>;
}

export function DiscoveryIntro({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return <div className="de-intro"><p className="de-eyebrow">{step}</p><h1>{title}</h1><p className="de-intro-copy">{children}</p></div>;
}

export function DiscoverySteps({ active }: { active: number }) {
  return <ol className="de-steps" aria-label="Étapes de recherche">{["Ton sport", "Ton coach", "Ta séance"].map((label, i) => <li key={label} aria-current={active === i ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{label}</li>)}</ol>;
}
