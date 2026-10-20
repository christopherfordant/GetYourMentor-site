import { socialLinks } from "@/lib/social-links";

export function SocialLinks() {
  if (!socialLinks.length) return null;
  return <nav className="footer-socials" aria-label="Réseaux sociaux">{socialLinks.map(({network,href}) => <a key={network} href={href} aria-label={`${network} — GetYourMentor (nouvelle fenêtre)`} rel="me noopener noreferrer" target="_blank"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{network === "Instagram" ? <g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".8"/></g> : network === "YouTube" ? <g><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m10 8 6 4-6 4Z" fill="currentColor"/></g> : <text x="12" y="18" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize={network === "LinkedIn" ? "18" : "21"} fill="currentColor">{network === "LinkedIn" ? "in" : network === "Facebook" ? "f" : network === "TikTok" ? "♪" : "X"}</text>}</svg></a>)}</nav>;
}
