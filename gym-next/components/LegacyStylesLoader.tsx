"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LEGACY_PREFIXES = [
  "/admin",
  "/coach",
  "/coachs",
  "/compte",
  "/creneau",
  "/inscription-club",
  "/paiement",
  "/recapitulatif",
  "/recherche",
];

export function LegacyStylesLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !LEGACY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;
    if (document.querySelector('link[data-legacy-prototype="true"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/legacy-prototype.css";
    link.dataset.legacyPrototype = "true";
    document.head.appendChild(link);
  }, [pathname]);

  return null;
}
