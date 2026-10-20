"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function GsapJourneyScene() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = document.querySelector<HTMLElement>('[data-gsap-section="journey"]');
    if (!section) return;

    const cards = gsap.utils.toArray<HTMLElement>("[data-gsap-card]", section);
    const heading = section.querySelector<HTMLElement>("[data-gsap-heading]");
    const lightLine = section.querySelector<HTMLElement>("[data-gsap-line]");
    if (!cards.length) return;

    const header = document.querySelector<HTMLElement>('[data-gsap-header]');
    const headerItems = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap-header-item]"));
    const hero = document.querySelector<HTMLElement>('[data-gsap-hero]');
    const motionAssets = Array.from(document.querySelectorAll<HTMLElement>("[data-motion-asset]"));
    const footballBall = motionAssets.find((asset) => asset.dataset.motionAsset === "football");
    const basketballBall = motionAssets.find((asset) => asset.dataset.motionAsset === "basketball");
    const heroItems = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap-hero-item]"));
    const heroImage = hero?.querySelector<HTMLElement>('[class*="heroImage__"]');
    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap-scene]"));

    gsap.fromTo(header, { autoAlpha: 0, y: -22 }, {
      autoAlpha: 1,
      y: 0,
      duration: 1.1,
      ease: "expo.out",
      clearProps: "transform,opacity,visibility",
    });

    const headerCleanup: Array<() => void> = [];

    const landingTimeline = gsap.timeline({ delay: 0.2 });
    headerItems.forEach((item) => {
      item.classList.add("gsap-header-tab");
      gsap.set(item, { "--tab-progress": 0, autoAlpha: 0 });

      const index = headerItems.indexOf(item);
      const itemTimeline = gsap.timeline();
      itemTimeline
        .fromTo(
          item,
          {
            autoAlpha: 0,
            x: index % 2 === 0 ? -150 - index * 18 : 150 + index * 18,
            y: -180 - index * 22,
            rotation: index % 2 === 0 ? -14 : 14,
            scale: 0.7,
            filter: "blur(10px)",
          },
          {
            autoAlpha: 1,
            x: index % 2 === 0 ? 14 : -14,
            y: 12,
            rotation: index % 2 === 0 ? 2 : -2,
            scale: 0.92,
            duration: 0.44,
            ease: "power2.in",
          },
        )
        .to(item, {
          x: 0,
          y: -5,
          rotation: 0,
          scale: 1.04,
          filter: "blur(0px)",
          duration: 0.26,
          ease: "back.out(2.2)",
        })
        .to(item, {
          y: 0,
          scale: 1,
          duration: 0.32,
          ease: "bounce.out",
          clearProps: "filter",
        });
      landingTimeline.add(itemTimeline, index * 0.12);

      const onEnter = () => {
        gsap.killTweensOf(item);
        gsap.to(item, {
          y: -3,
          scale: 1.035,
          color: "#ffffff",
          "--tab-progress": 1,
          duration: 0.34,
          ease: "power3.out",
        });
      };
      const onLeave = () => {
        gsap.to(item, {
          y: 0,
          scale: 1,
          clearProps: "color",
          "--tab-progress": 0,
          duration: 0.42,
          ease: "power3.out",
        });
      };

      item.addEventListener("pointerenter", onEnter);
      item.addEventListener("pointerleave", onLeave);
      item.addEventListener("focus", onEnter);
      item.addEventListener("blur", onLeave);
      headerCleanup.push(() => {
        item.removeEventListener("pointerenter", onEnter);
        item.removeEventListener("pointerleave", onLeave);
        item.removeEventListener("focus", onEnter);
        item.removeEventListener("blur", onLeave);
      });
    });
    landingTimeline.play();

    gsap.fromTo(heroItems, { autoAlpha: 0, y: 54, filter: "blur(12px)" }, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 1.25,
      stagger: 0.13,
      delay: 0.18,
      ease: "expo.out",
      clearProps: "filter",
    });

    // Start shortly after the client view is mounted. Waiting for the full
    // window load made the effect invisible on slower connections.
    const ballTimeline = gsap.timeline({ paused: true });
    const footballTab = document.querySelector<HTMLElement>('[data-sport-tab="football"]');
    const basketballTab = document.querySelector<HTMLElement>('[data-sport-tab="basketball"]');

    const choreographBall = (
      asset: HTMLElement | undefined,
      target: HTMLElement | null,
      index: number,
      fromX: number,
      fromY: number,
      rotation: number,
      exitX: number,
      exitY: number,
    ) => {
      if (!asset || !target) return;
      const assetRect = asset.getBoundingClientRect();
      // The header entrance temporarily translates the tabs. Measure their
      // layout position without that temporary transform so the ball always
      // targets the final, visible tab position.
      const targetInlineStyle = target.getAttribute("style");
      target.removeAttribute("style");
      const targetRect = target.getBoundingClientRect();
      if (targetInlineStyle) target.setAttribute("style", targetInlineStyle);
      const impactX = targetRect.left + targetRect.width / 2 - (assetRect.left + assetRect.width / 2);
      const impactY = targetRect.top + targetRect.height / 2 - (assetRect.top + assetRect.height / 2);
      const position = index * 1.4;

      gsap.set(asset, { autoAlpha: 0, x: 0, y: 0, scale: 0.72, rotate: rotation * 0.2 });
      ballTimeline
        .to(asset, { autoAlpha: 1, x: fromX, y: fromY, duration: 0.01 }, position)
        .to(asset, { x: impactX, y: impactY, scale: 1, rotate: rotation, duration: 3.2, ease: "power2.in" }, position)
        .call(() => target.classList.add("gsap-ball-impact"), [], position + 2.8)
        .to(target, { x: index % 2 ? -7 : 7, y: -2, duration: 0.06, repeat: 3, yoyo: true, ease: "power1.inOut" }, position + 2.8)
        .call(() => target.classList.remove("gsap-ball-impact"), [], position + 3.15)
        .to(asset, { x: exitX, y: exitY, autoAlpha: 0, scale: 0.46, rotate: rotation * 1.4, duration: 1, ease: "power3.in" }, position + 3)
        .set(target, { x: 0, y: 0 }, position + 4.2);
    };

    // Start just beyond each viewport edge. Starting several screen widths
    // away made the first seconds look frozen even though GSAP was running.
    choreographBall(footballBall, footballTab, 0, -180, window.innerHeight * 0.2, -720, window.innerWidth * 0.8, -120);
    choreographBall(basketballBall, basketballTab, 1, window.innerWidth + 180, -window.innerHeight * 0.18, 720, -window.innerWidth * 0.8, -120);
    const ballStartTimer = window.setTimeout(() => ballTimeline.play(0), 800);

    if (heroImage) {
      gsap.to(heroImage, {
        yPercent: 7,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }

    if (header) {
      gsap.to(header, {
        backgroundColor: "rgba(8, 14, 29, .78)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 14px 34px rgba(0, 0, 0, .18)",
        paddingTop: "10px",
        paddingBottom: "10px",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=180",
          scrub: 0.8,
        },
      });
    }

    scenes.forEach((scene) => {
      const items = gsap.utils.toArray<HTMLElement>("[data-gsap-stagger], [data-gsap-recruit-media], [data-gsap-recruit-copy]", scene);
      if (!items.length) return;
      gsap.set(items, { autoAlpha: 0, y: 78, rotateX: 8, filter: "blur(10px)" });
      gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
        duration: 1.15,
        stagger: 0.11,
        ease: "expo.out",
        scrollTrigger: {
          trigger: scene,
          start: "top 78%",
          end: "top 42%",
          scrub: 0.9,
          toggleActions: "play none none reverse",
        },
      });
    });

    const mm = gsap.matchMedia();

    mm.add("(min-width: 901px)", () => {
      gsap.set(cards, {
        autoAlpha: 0,
        y: 110,
        scale: 0.84,
        filter: "blur(14px)",
        transformOrigin: "50% 100%",
      });

      gsap.set([heading, lightLine].filter(Boolean), { autoAlpha: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top+=72",
          end: "+=1500",
          pin: true,
          // The reveal must settle quickly when the user stops scrolling.
          // A long scrub combined with snap made the timeline keep moving
          // after the gesture ended and could send the last card backwards.
          scrub: 0.55,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(heading, { autoAlpha: 1, y: -8, duration: 0.18, ease: "power2.out" })
        .to(lightLine, { autoAlpha: 1, scaleX: 1, duration: 0.16, ease: "power2.out" }, "<")
        .addLabel("coach")
        .to(cards[0], { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.34, ease: "expo.out" })
        .addLabel("slots")
        .to(cards[1], { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.34, ease: "expo.out" })
        .addLabel("payment")
        .to(cards[2], { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.34, ease: "expo.out" })
        .to(cards, { y: (index) => (index - 1) * -10, duration: 0.22, ease: "power1.inOut" });

      return () => timeline.scrollTrigger?.kill();
    });

    mm.add("(max-width: 900px)", () => {
      gsap.set(cards, { autoAlpha: 0, y: 70, scale: 0.94, filter: "blur(10px)" });
      cards.forEach((card) => {
        gsap.to(card, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: {
            trigger: card,
            start: "top 82%",
            end: "top 46%",
            scrub: 0.8,
          },
        });
      });
    });

    return () => {
      headerCleanup.forEach((cleanup) => cleanup());
      window.clearTimeout(ballStartTimer);
      ballTimeline.kill();
      mm.revert();
    };
  }, { scope });

  return <div ref={scope} className="gsap-journey-runtime" aria-hidden="true" />;
}
