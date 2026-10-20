export type SportMotionPreset = {
  introX: number;
  introY: number;
  rotation: number;
  ease: string;
  floatY: number;
  floatDuration: number;
};

export const sportMotionPresets: Record<string, SportMotionPreset> = {
  football: { introX: -54, introY: -120, rotation: -22, ease: "power3.out", floatY: 7, floatDuration: 2.3 },
  basketball: { introX: 46, introY: -150, rotation: 18, ease: "bounce.out", floatY: -9, floatDuration: 1.9 },
  fitness: { introX: 52, introY: 110, rotation: -12, ease: "power4.out", floatY: -5, floatDuration: 2.7 },
  combat: { introX: -46, introY: 90, rotation: 14, ease: "back.out(1.8)", floatY: 6, floatDuration: 1.7 },
};
