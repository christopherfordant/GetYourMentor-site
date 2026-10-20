export type MotionSport = "football" | "basketball" | "fitness" | "combat";

export type MotionAsset = {
  id: string;
  sport: MotionSport;
  src: string;
  alt: string;
};

export const motionAssets: MotionAsset[] = [
  { id: "football-ball", sport: "football", src: "/images/demo-sport.svg", alt: "Ballon de football" },
  { id: "football-boots", sport: "football", src: "/images/demo-sport.svg", alt: "Chaussures de football" },
  { id: "football-cone", sport: "football", src: "/images/demo-sport.svg", alt: "Cône d’entraînement de football" },
  { id: "basketball-ball", sport: "basketball", src: "/images/demo-sport.svg", alt: "Ballon de basketball" },
  { id: "basketball-hoop", sport: "basketball", src: "/images/demo-sport.svg", alt: "Panier de basketball" },
  { id: "basketball-shoes", sport: "basketball", src: "/images/demo-sport.svg", alt: "Chaussures de basketball" },
  { id: "fitness-dumbbell", sport: "fitness", src: "/images/demo-sport.svg", alt: "Haltère de fitness" },
  { id: "fitness-kettlebell", sport: "fitness", src: "/images/demo-sport.svg", alt: "Kettlebell de fitness" },
  { id: "fitness-band", sport: "fitness", src: "/images/demo-sport.svg", alt: "Élastique de résistance" },
  { id: "combat-glove", sport: "combat", src: "/images/demo-sport.svg", alt: "Gant de boxe" },
  { id: "combat-mitt", sport: "combat", src: "/images/demo-sport.svg", alt: "Pattes d’ours de combat" },
  { id: "combat-shin-guards", sport: "combat", src: "/images/demo-sport.svg", alt: "Protège-tibias de combat" },
];
