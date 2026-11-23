import type { RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Page entrance motion for the portal: header, then cards and table rows in a short stagger.
 * Runs on every navigation, is skipped when the user prefers reduced motion, and always
 * leaves elements fully visible afterwards (clearProps), so it can never hide content.
 */
export function usePageMotion(scope: RefObject<HTMLElement | null>, key: string) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out", clearProps: "transform,opacity,visibility" },
        });
        tl.from("[data-anim='header']", { y: 14, autoAlpha: 0, duration: 0.45 });
        tl.from(
          "[data-anim='card']",
          { y: 22, autoAlpha: 0, duration: 0.55, stagger: { each: 0.05, amount: 0.5 } },
          "-=0.25",
        );
        const rows = gsap.utils.toArray<HTMLElement>("[data-anim='row']").slice(0, 14);
        if (rows.length)
          tl.from(rows, { y: 8, autoAlpha: 0, duration: 0.35, stagger: 0.025 }, "-=0.3");
        return () => tl.kill();
      });
      return () => mm.revert();
    },
    { scope, dependencies: [key], revertOnUpdate: true },
  );
}
