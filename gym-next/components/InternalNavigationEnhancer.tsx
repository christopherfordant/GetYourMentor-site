"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function isInternalPath(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function InternalNavigationEnhancer() {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      if (
        anchor.hasAttribute("download") ||
        anchor.target === "_blank" ||
        anchor.rel.includes("external") ||
        !isInternalPath(href)
      ) {
        return;
      }

      event.preventDefault();
      router.push(href);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return null;
}
