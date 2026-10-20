import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentSession } from "@/lib/auth";
import { getReservation } from "@/lib/reservations";
import { hasBookingBrowserProof } from "@/lib/repositories/reservation-repository";
import { attemptScope, bookingRecoveryEnabled, BookingAttemptError } from "@/lib/booking-attempt-server";
import { isReservationClaimTokenValid, reservationClaimToken } from "@/lib/reservation-claims";
import { summaryAccess, summaryFields, summaryProofWindow } from "@/lib/booking-summary-server";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
export async function POST(request: Request) {
  if (!rateLimit(request,"reservation-summary",120,60000).allowed) return NextResponse.json({error:"Réessayez plus tard"},{status:429,headers});
  if (bodyExceedsLimit(request,2048)) return NextResponse.json({error:"Requête trop volumineuse"},{status:413,headers});
  const body = await request.json().catch(()=>null);
  if (typeof body?.reservationId !== "string" || !/^res-[a-zA-Z0-9-]{1,128}$/.test(body.reservationId) || (body.claimToken !== undefined && (typeof body.claimToken !== "string" || body.claimToken.length > 512))) return NextResponse.json({error:"Référence de réservation manquante ou invalide"},{status:400,headers});
  try {
    const session = await currentSession();
    const reservation = await getReservation(body.reservationId);
    if (!reservation) return NextResponse.json({error:"Réservation introuvable"},{status:404,headers});
    if(reservation.id!==body.reservationId) throw new Error("Inconsistent reservation");
    const store=await cookies(); const cookieName=`gym-claim-${reservation.id}`;
    let proof=false;
    const strongSecret=(process.env.SESSION_SECRET?.length ?? 0)>=32;
    if (!reservation.ownerEmail && strongSecret && summaryProofWindow(reservation)) {
      const token=body.claimToken ?? store.get(cookieName)?.value;
      if (token !== undefined) proof=isReservationClaimTokenValid(reservation.id,token);
      else if(bookingRecoveryEnabled()) {
        try { proof=await hasBookingBrowserProof(reservation.id,await attemptScope(session?.email)); } catch (error) { if (!(error instanceof BookingAttemptError && error.status===403)) throw error; }
      }
    }
    if (!summaryAccess(session,reservation,proof)) return NextResponse.json({error:"Accès refusé. Connectez-vous au compte propriétaire ou utilisez une preuve valide."},{status:403,headers});
    const claimToken=!reservation.ownerEmail && proof ? reservationClaimToken(reservation.id) ?? undefined : undefined;
    const data=summaryFields(reservation,Boolean(session));
    if(claimToken)store.set(cookieName,claimToken,{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/api/reservations",maxAge:Math.max(1,Math.floor((Date.parse(reservation.createdAt)+86400000-Date.now())/1000))});
    return NextResponse.json({data},{headers});
  } catch { return NextResponse.json({error:"Le récapitulatif n’a pas pu être chargé. Réessayez sans créer une nouvelle demande."},{status:502,headers}); }
}
