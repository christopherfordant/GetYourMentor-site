// Business Plan, physical pages 35–36. Planned commercial terms, not active rights.
export const offersCatalog = {
  coach: { id: "coach-premium", name: "Coach Premium", priceCents: 1999, period: "month", source: "Business Plan p.35",
    benefits: ["0 % de commission sur les séances prévu, non activé", "Visibilité, badge Premium et templates prévus", "Statistiques avancées et support prioritaire prévus", "Vente de contenus : commission de 20 % prévue"] },
  club: { id: "structure", name: "Structure", priceCents: 2999, period: "month", includedCoaches: 2, extraCoachCents: 399, extraCoachPeriod: null, source: "Business Plan p.35–36",
    benefits: ["Deux coachs dans la formule prévue", "Avantages Premium prévus pour les coachs", "Supplément par coach : périodicité à confirmer avant souscription"] },
} as const;
export function formatOfferPrice(cents: number) { return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
