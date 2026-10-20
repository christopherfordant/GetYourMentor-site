export type SportSlug =
  | "football"
  | "basketball"
  | "metiers-de-la-forme"
  | "sports-de-combat";

export const sportLinks: Array<{ label: string; slug: SportSlug; coachCount: string }> = [
  { label: "Football", slug: "football", coachCount: "Explorer les profils" },
  { label: "Basketball", slug: "basketball", coachCount: "Explorer les profils" },
  { label: "Fitness", slug: "metiers-de-la-forme", coachCount: "Explorer les profils" },
  { label: "Sports de combat", slug: "sports-de-combat", coachCount: "Explorer les profils" },
];

export const profileSlides = [
  {
    name: "Thomas Dubois",
    meta: "Football - Paris",
    detail: "Spécialiste préparation match - 12 ans d'expérience",
    price: "50 EUR / séance",
    cta: "Voir le profil",
    image: "/images/demo-sport.svg",
  },
  {
    name: "Sarah Benali",
    meta: "Basketball - Lyon",
    detail: "Technique individuelle - Séances intensives",
    price: "65 EUR / séance",
    cta: "Découvrir le coach",
    image: "/images/demo-sport.svg",
  },
  {
    name: "Julien Morel",
    meta: "Fitness - Lille",
    detail: "Remise en forme - Coaching progressif",
    price: "42 EUR / séance",
    cta: "Voir ses séances",
    image: "/images/demo-sport.svg",
  },
  {
    name: "Ines Caron",
    meta: "Sports de combat - Marseille",
    detail: "Self-defense - Conditionnement physique",
    price: "70 EUR / séance",
    cta: "Réserver ce coach",
    image: "/images/demo-sport.svg",
  },
];

export const slotSlides = [
  {
    title: "Choisissez jusqu'à 3 créneaux",
    visual: "/images/demo-sport.svg",
    selection: "1 créneau sélectionné",
    cta: "Proposer mes créneaux",
    slots: ["10:30", "15:00"],
  },
  {
    title: "Sélectionnez un créneau prioritaire",
    visual: "/images/demo-sport.svg",
    selection: "2 créneaux sélectionnés",
    cta: "Envoyer mes disponibilités",
    slots: ["08:00", "18:30"],
  },
  {
    title: "Ajoutez un créneau de secours",
    visual: "/images/demo-sport.svg",
    selection: "3 créneaux sélectionnés",
    cta: "Valider ma sélection",
    slots: ["12:15", "19:00"],
  },
  {
    title: "Validez vos disponibilités",
    visual: "/images/demo-sport.svg",
    selection: "Prêt à envoyer",
    cta: "Continuer",
    slots: ["09:45", "17:15"],
  },
];

export const paymentSlides = [
  {
    title: "Thomas Dubois - Football",
    date: "Mer. 26 mars - 14:00",
    detail: "Séance 1h30 - Paris",
    total: "62 EUR",
  },
  {
    title: "Sarah Benali - Basketball",
    date: "Jeu. 28 mars - 18:30",
    detail: "Séance 1h00 - Lyon",
    total: "74 EUR",
  },
  {
    title: "Julien Morel - Fitness",
    date: "Ven. 29 mars - 08:00",
    detail: "Séance 45 min - Lille",
    total: "48 EUR",
  },
  {
    title: "Ines Caron - Sports de combat",
    date: "Sam. 30 mars - 12:15",
    detail: "Séance 1h15 - Marseille",
    total: "79 EUR",
  },
];

export const metrics = [
  { value: "4", label: "disciplines" },
  { value: "3", label: "profils accompagnés" },
  { value: "En ligne", label: "recherche et réservation" },
];

export const insights = [
  { value: "01", copy: "Un objectif clair pour guider ta recherche" },
  { value: "02", copy: "Un échange avec un coach avant de confirmer" },
  {
    value: "03",
    copy: "Une session validée, puis un paiement sécurisé",
    featured: true,
  },
  { value: "04", copy: "Un rythme que tu peux tenir dans la durée" },
  { value: "05", copy: "Des repères pour revenir et progresser" },
  { value: "06", copy: "Un espace coach pour gérer ses demandes" },
];

export const localeColumns = [
  {
    title: "Football",
    copy: "Nos coachs football populaires en France",
    slug: "football" as SportSlug,
  },
  {
    title: "Basketball",
    copy: "Nos coachs basketball populaires en France",
    slug: "basketball" as SportSlug,
  },
  {
    title: "Fitness",
    copy: "Nos coachs forme populaires en France",
    slug: "metiers-de-la-forme" as SportSlug,
  },
  {
    title: "Sports de combat",
    copy: "Nos coachs combat populaires en France",
    slug: "sports-de-combat" as SportSlug,
  },
];

export const locales = [
  "Bordeaux",
  "Lille",
  "Lyon",
  "Marseille",
  "Montpellier",
  "Nantes",
  "Nice",
  "Paris",
  "Strasbourg",
  "Toulouse",
];

export const faqItems = [
  {
    question: "Qu'est-ce que GetYourMentor ?",
    answer:
      "GetYourMentor est une plateforme qui aide les sportifs à trouver un coach, envoyer une demande de réservation et payer seulement après validation du coach.",
  },
  {
    question: "Comment réserver une séance sur GetYourMentor ?",
    answer:
      "Vous choisissez un coach, une séance, puis vous proposez un à trois créneaux. Le coach accepte ou refuse avant toute étape de paiement.",
  },
  {
    question: "Est-ce que je dois payer en ligne sur GetYourMentor ?",
    answer:
      "Oui, mais uniquement une fois que le coach a validé votre demande. Aucun paiement n'est déclenché avant acceptation.",
  },
  {
    question: "Comment gérer mes demandes et mes réservations ?",
    answer:
      "Depuis votre espace compte, vous pouvez consulter vos demandes envoyées, vos validations, vos réservations confirmées et vos informations de paiement.",
  },
  {
    question: "Comment devenir coach partenaire sur GetYourMentor ?",
    answer:
      "Vous pouvez rejoindre le réseau en créant votre compte professionnel puis en complétant votre profil, vos sports, vos disponibilités et vos conditions de séance.",
  },
];
