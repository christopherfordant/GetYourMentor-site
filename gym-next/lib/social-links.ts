export type SocialNetwork = "Instagram" | "LinkedIn" | "Facebook" | "YouTube" | "TikTok" | "X";
export type SocialLink = { network: SocialNetwork; href: string };

// Add only official URLs verified in project sources or supplied by the owner.
// No official account URL was found in the local corpus on 2026-10-15.
export const socialLinks: readonly SocialLink[] = [];
