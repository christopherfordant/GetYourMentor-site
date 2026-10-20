export type SportSlug = "football" | "basketball" | "fitness" | "sports-de-combat";

export type CoachProfile = {
  id: string;
  name: string;
  sport: SportSlug;
  specialty: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  groupPrices?: Array<{ participantCount: number; totalCents: number }>;
  verified: boolean;
  verificationStatus?: "pending" | "approved" | "rejected";
  description: string;
  disciplines?: string;
  diplomas?: string;
  sessionTypes?: string;
  availability?: string;
  photoUrl?: string;
  bankAccountLast4?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  gender?: "homme" | "femme";
  practice?: "interieur" | "exterieur";
  level?: "debutant" | "intermediaire" | "confirme";
  format?: "presentiel" | "visio";
  availabilityTags?: Array<"morning" | "afternoon">;
};

export type ReservationStatus = "requested" | "accepted" | "rejected" | "cancelled" | "paid";

export type Reservation = {
  id: string;
  ownerEmail?: string;
  participantCount?: number;
  additionalParticipants?: import("@/lib/domain/participants").AdditionalParticipant[];
  coachId: string;
  coachName: string;
  sport: SportSlug;
  city: string;
  service: string;
  duration: string;
  price: number;
  slots: string[];
  status: ReservationStatus;
  createdAt: string;
  reservationCode?: string;
  acceptedAt?: string;
  appointmentAt?: string;
  refundPercent?: number;
  refundAmount?: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  structureOfferId?: string;
  stripeRefundId?: string;
  refundStatus?: "not_required" | "pending" | "succeeded";
  cancelledAt?: string;
  confirmationStatus?: "sent" | "queued" | "skipped";
  financials?: import("@/lib/domain/commission").FinancialSnapshot;
  demoPaymentConfirmation?: Readonly<{ mode: "simulated"; confirmedAt: string; reference: string }>;
  refundedPlatformFeeCents?: number;
};

export function canonicalSportSlug(value?: string) {
  if (!value) return undefined;
  return value === "metiers-de-la-forme" ? "fitness" : value;
}

export const coachProfiles: CoachProfile[] = [
  {
    id: "coach-demo-01",
    name: "Coach Démo 01",
    sport: "basketball",
    specialty: "Coach basketball individuel",
    city: "Marseille",
    rating: 4.9,
    reviewCount: 38,
    priceFrom: 35,
    verified: true,
    description: "Coach spécialisé dans le travail technique individuel, le développement du tir et la progression des jeunes joueurs.",
    disciplines: "Basketball, préparation physique",
    diplomas: "BPJEPS — à compléter",
    sessionTypes: "Individuel, duo, visio",
    availability: "Lundi à vendredi, 18h–21h",
    photoUrl: "",
    bankAccountLast4: "",
  },
  {
    id: "coach-demo-02",
    name: "Coach Démo 02",
    sport: "football",
    specialty: "Coach football",
    city: "Paris",
    rating: 4.8,
    reviewCount: 24,
    priceFrom: 40,
    verified: true,
    description: "Accompagnement individuel pour progresser techniquement et gagner en confiance sur le terrain.",
    disciplines: "Football, préparation physique",
    diplomas: "Diplôme fédéral — à compléter",
    sessionTypes: "Individuel, collectif",
    availability: "Mardi et jeudi, 17h–20h · Samedi matin",
    photoUrl: "",
    bankAccountLast4: "",
  },
  {
    id: "studio-demo",
    name: "Studio Démo",
    sport: "fitness",
    specialty: "Coaching remise en forme",
    city: "Marseille",
    rating: 4.7,
    reviewCount: 19,
    priceFrom: 35,
    verified: true,
    description: "Séances personnalisées pour reprendre une activité régulière et progresser à son rythme.",
    disciplines: "Fitness, remise en forme",
    diplomas: "Certification fitness — à compléter",
    sessionTypes: "Individuel, duo, visio",
    availability: "Du lundi au samedi, 7h–12h",
    photoUrl: "",
    bankAccountLast4: "",
  },
];

export function findCoach(idOrName?: string) {
  if (!idOrName) return coachProfiles[0];
  const normalized = decodeURIComponent(idOrName).toLowerCase();
  return coachProfiles.find((coach) => coach.id === normalized || coach.name.toLowerCase() === normalized) ?? coachProfiles[0];
}

export function coachIdForName(name: string) {
  return `coach-${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function filterCoaches({ sport, city }: { sport?: string; city?: string }) {
  const canonicalSport = canonicalSportSlug(sport);
  return coachProfiles.filter((coach) => {
    if (!coach.verified) return false;
    const sportMatches = !canonicalSport || coach.sport === canonicalSport;
    const cityMatches = !city || coach.city.toLowerCase() === city.toLowerCase();
    return sportMatches && cityMatches;
  });
}

export function setCoachVerification(id: string, verified: boolean) {
  const coach = coachProfiles.find((entry) => entry.id === id);
  if (!coach) return null;
  coach.verified = verified;
  return coach;
}

export function updateCoachProfile(id: string, updates: Partial<Pick<CoachProfile, "specialty" | "city" | "priceFrom" | "description" | "disciplines" | "diplomas" | "sessionTypes" | "availability" | "photoUrl" | "bankAccountLast4">>) {
  const coach = coachProfiles.find((entry) => entry.id === id);
  if (!coach) return null;
  Object.assign(coach, updates);
  return coach;
}

export function createCoachProfile(input: { name: string; id?: string; city?: string }) {
  const id = input.id ?? coachIdForName(input.name);
  const existing = coachProfiles.find((coach) => coach.id === id);
  if (existing) return existing;
  const coach: CoachProfile = {
    id,
    name: input.name,
    sport: "fitness",
    specialty: "Coach sportif à compléter",
    city: input.city ?? "",
    rating: 0,
    reviewCount: 0,
    priceFrom: 0,
    verified: false,
    description: "",
    disciplines: "",
    diplomas: "",
    sessionTypes: "",
    availability: "À définir",
    photoUrl: "",
    bankAccountLast4: "",
  };
  coachProfiles.push(coach);
  return coach;
}
