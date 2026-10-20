"use client";
import { coachMonthlyFinance,formatFinanceCents } from "@/lib/domain/coach-finance";
export function CoachFinanceSummary({summary,loading,error,demo}:{summary:ReturnType<typeof coachMonthlyFinance>|null;loading:boolean;error:boolean;demo:boolean}){
 if(loading)return <p role="status">Chargement des montants…</p>;
 if(error)return <p role="alert">Montants indisponibles. Recharge la page pour réessayer.</p>;
 if(!summary)return <p>Profil coach non identifié : montants indisponibles.</p>;
 const result=summary,partial=result.missing+result.ambiguousCancelled+result.undated>0;
 return <div data-coach-finance><p><strong>Réservations créées en {result.label}</strong> · Europe/Paris</p>{result.invalidPeriod?<p role="alert">Période invalide : mois courant affiché.</p>:null}<p>Statuts payés et annulations dont le paiement antérieur est documenté. Période fondée sur la création, pas sur la date de paiement.</p>
 <dl>{([ ["Brut historique","grossCents"],["Remboursements enregistrés effectués","refundCents"],["Commission historique restante","feeCents"],["Part coach après remboursements enregistrés","coachCents"] ] as const).map(([label,key])=><div key={key}><dt>{label}</dt><dd data-finance-amount={key}>{result.totals?formatFinanceCents(result.totals[key]):"Indisponible"}</dd></div>)}</dl>
 <p>{result.documented} réservation(s) documentée(s). {partial?"Sous-total partiel : des données sont exclues.":"Aucune donnée financière manquante détectée dans ce périmètre."}</p>
 {result.missing>0?<p>{result.missing} dossier(s) exclu(s) : historique financier ou remboursement inexploitable.</p>:null}
 {result.ambiguousCancelled>0?<p>{result.ambiguousCancelled} annulation(s) exclue(s) : paiement antérieur non attesté.</p>:null}
 {result.undated>0?<p>{result.undated} dossier(s) sans date de création exploitable, non rattachable(s) au mois.</p>:null}
 {result.pendingRefunds>0?<p>{result.pendingRefunds} remboursement(s) en attente : non déduit(s) des montants enregistrés.</p>:null}
 <p>{demo?"Montants de démonstration ; aucun reversement bancaire réel.":"Montants enregistrés dans les réservations ; aucun encaissement bancaire attesté par cette synthèse."}</p></div>;
}
