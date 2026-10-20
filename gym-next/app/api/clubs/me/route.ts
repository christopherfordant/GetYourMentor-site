import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getClubLeadForEmail } from "@/lib/clubs";

export async function GET() {
  const session = await requireRole("club");
  if (!session) return NextResponse.json({ error: "Connexion club requise" }, { status: 401 });

  try {
    const lead = await getClubLeadForEmail(session.email);
    return NextResponse.json({
      data: lead
        ? {
            id: lead.id,
            clubName: lead.clubName,
            managerName: lead.managerName,
            email: lead.email,
            phone: lead.phone,
            addressLabel: lead.addressLabel,
            latitude: lead.latitude,
            longitude: lead.longitude,
            logoFileName: lead.logoFileName,
            identityFileName: lead.identityFileName,
            createdAt: lead.createdAt,
            status: lead.status,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Demande club indisponible" }, { status: 502 });
  }
}
