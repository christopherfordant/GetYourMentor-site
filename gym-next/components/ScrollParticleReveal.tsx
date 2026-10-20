"use client";

import { useEffect } from "react";

const CARD_SELECTOR = [
  '[class*="stepCard__"]:not([data-gsap-card])',
  '[class*="insightCard__"]:not([data-gsap-stagger])',
  '[class*="localeColumn__"]:not([data-gsap-stagger])',
  ".sport-city-card",
  ".coach-result-card",
  ".coach-profile-card",
  ".coach-booking-card",
  ".booking-card",
  ".booking-contact-card",
  ".reservation-card",
  ".payment-card",
  ".payment-summary-card",
  ".recap-service-card",
  ".recap-date-card",
  ".recap-auth-card",
  ".auth-card",
  ".account-dashboard-card",
  ".account-panel",
  ".club-signup-form-card",
  ".reservation-selection-panel",
  ".reservation-calendar-card",
  ".coach-map-panel",
].join(",");

const SCENE_SELECTOR = [
  '[class*="sportRail__"]',
  '[class*="metricsSection__"]',
  '[class*="recruitSection__"]',
  '[class*="faqSection__"]',
].join(",");

export function ScrollParticleReveal() {
  useEffect(() => {
    document.documentElement.classList.add("scroll-reveal-ready");

    // Business forms and dashboards must remain readable regardless of scroll/height.
    const cards = Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR))
      .filter(card => !card.closest("#gym-account, .payment-shell"));
    cards.forEach((card, index) => {
      card.classList.add("scroll-particle-card");
      card.style.setProperty("--particle-delay", `${Math.min(index % 5, 4) * 150}ms`);
    });

    const scenes = Array.from(document.querySelectorAll<HTMLElement>(SCENE_SELECTOR));
    scenes.forEach((scene, index) => {
      scene.classList.add("scroll-scene");
      scene.style.setProperty("--scene-delay", `${Math.min(index % 4, 3) * 70}ms`);
    });

    let frame = 0;
    const activeScenes = new Set<HTMLElement>();
    const isSmallScreen = window.matchMedia("(max-width: 700px)").matches;
    const updateScrollDepth = () => {
      frame = 0;
      activeScenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const travel = window.innerHeight + rect.height;
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / travel));
        scene.style.setProperty("--scene-progress", progress.toFixed(3));
        scene.style.setProperty("--scene-drift", `${((0.5 - progress) * 24).toFixed(2)}px`);
        scene.style.setProperty("--scene-scale", (0.992 + progress * 0.008).toFixed(4));
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollDepth);
    };
    // Keep reveal observers on mobile, but avoid recalculating every active
    // scene on every scroll frame in the constrained viewport.
    if (!isSmallScreen) {
      updateScrollDepth();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const onResize = () => {
      if (isSmallScreen) return;
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollDepth);
    };
    window.addEventListener("resize", onResize, { passive: true });

    if (typeof IntersectionObserver === "undefined") {
      cards.forEach((card) => card.classList.add("is-revealed"));
      scenes.forEach((scene) => scene.classList.add("is-revealed"));
      return () => {
        document.documentElement.classList.remove("scroll-reveal-ready");
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.classList.add("is-revealed");
            if (scenes.includes(element)) activeScenes.add(element);
          } else if (scenes.includes(element)) {
            activeScenes.delete(element);
          }
        });
        if (!isSmallScreen && !frame) frame = window.requestAnimationFrame(updateScrollDepth);
      },
      { threshold: 0.18, rootMargin: "0px 0px -18% 0px" },
    );

    cards.forEach((card) => observer.observe(card));
    scenes.forEach((scene) => observer.observe(scene));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("scroll-reveal-ready");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
