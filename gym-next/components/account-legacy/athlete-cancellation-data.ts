import type { Reservation } from "@/lib/domain";
import { sameDemoBooking } from "@/components/payment-legacy/demo-payment-data";
import { refundPercentForAppointment } from "@/lib/domain/booking-rules";
import { eurosToCents, refundedCommissionCents } from "@/lib/domain/commission";
export function coherentCancellation(row: Reservation, original?: Reservation) {
  try {
  if (row.status !== "cancelled" || !row.cancelledAt || !Number.isFinite(Date.parse(row.cancelledAt)) || Date.parse(row.cancelledAt) > Date.now() + 5000 || Date.parse(row.cancelledAt) < Date.parse(row.createdAt)) return false;
  if (![0,50,100].includes(row.refundPercent!) || typeof row.refundAmount !== "number" || !Number.isFinite(row.refundAmount) || row.refundAmount < 0 || Math.abs(row.refundAmount-eurosToCents(row.refundAmount)/100)>1e-9 || eurosToCents(row.refundAmount) !== Math.round(eurosToCents(row.price) * row.refundPercent! / 100)) return false;
  if (row.refundPercent! > 0 ? !["pending","succeeded"].includes(row.refundStatus!) : row.refundStatus !== "not_required") return false;
  if (original) {
    if (!sameDemoBooking(original,row)) return false;
    const expected = original.status === "paid" && original.appointmentAt ? refundPercentForAppointment(original.appointmentAt,new Date(row.cancelledAt)) : 0;
    if (original.status !== "cancelled" && row.refundPercent !== expected) return false;
    if (original.status === "cancelled" && ["cancelledAt","refundPercent","refundAmount","refundedPlatformFeeCents"].some(k=>original[k as keyof Reservation] !== row[k as keyof Reservation])) return false;
  }
  if (row.financials && row.refundedPlatformFeeCents !== refundedCommissionCents(row.financials,eurosToCents(row.refundAmount))) return false;
  return true;
  } catch { return false; }
}
export function cancellationRefundLabel(row: Reservation,demo:boolean) {
  const prefix=demo?"Remboursement simulé":"Remboursement";
  if (!coherentCancellation(row)) return `${prefix} : informations indisponibles ou incohérentes.`;
  return `${prefix} : ${row.refundPercent}% (${row.refundAmount} EUR) · ${row.refundStatus === "pending" ? "en attente" : row.refundStatus === "succeeded" ? "enregistré" : "non requis"}${demo?". Aucun transfert bancaire réel.":""}`;
}
