export type FinancialSnapshot = {
  currency: "eur";
  grossCents: number;
  commissionBps: number;
  commissionVersion: number;
  platformFeeCents: number;
  coachAmountCents: number;
};

export function validateCommissionBps(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error("Le taux doit être compris entre 0 et 100 %, avec deux décimales maximum");
  }
  return value;
}

export function eurosToCents(price: number): number {
  if (!Number.isFinite(price) || price < 0 || price > 99_999_999) throw new Error("Montant invalide");
  const cents = Math.round((price + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Montant invalide");
  return cents;
}

// Arrondi commercial au centime, calcul entier : les frais Stripe éventuels sont exclus.
export function financialSnapshot(price: number, bps: number, version: number): FinancialSnapshot {
  const grossCents = eurosToCents(price);
  validateCommissionBps(bps);
  const platformFeeCents = Number((BigInt(grossCents) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
  return { currency: "eur", grossCents, commissionBps: bps, commissionVersion: version, platformFeeCents, coachAmountCents: grossCents - platformFeeCents };
}

// Prorata sur le montant historique ; un remboursement total restitue exactement la commission.
export function refundedCommissionCents(snapshot: FinancialSnapshot, refundCents: number): number {
  if (!Number.isSafeInteger(refundCents) || refundCents < 0 || refundCents > snapshot.grossCents) throw new Error("Remboursement invalide");
  if (!snapshot.grossCents) return 0;
  return Number((BigInt(snapshot.platformFeeCents) * BigInt(refundCents) + BigInt(Math.floor(snapshot.grossCents / 2))) / BigInt(snapshot.grossCents));
}
