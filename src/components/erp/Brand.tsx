import { useEffect } from "react";

import { useERP } from "@/lib/erp/store";
import { cn } from "@/lib/utils";

/** The brand mark: the uploaded logo, or the first letter of the brand name. */
export function BrandMark({ className }: { className?: string }) {
  const { settings } = useERP();
  const letter = settings.brandName.trim().charAt(0) || "b";
  return settings.logoDataUrl ? (
    <img
      src={settings.logoDataUrl}
      alt=""
      className={cn("size-8 shrink-0 rounded-md object-contain", className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground",
        className,
      )}
    >
      {letter}
    </span>
  );
}

const ORIGINAL = "data-original-href";
const ORIGINAL_TYPE = "data-original-type";

/** Apply (or restore) the favicon in the document head. */
function applyFavicon(dataUrl: string) {
  if (typeof document === "undefined") return;
  let links = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"));
  if (links.length === 0 && dataUrl) {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
    links = [link];
  }
  for (const link of links) {
    if (!link.hasAttribute(ORIGINAL)) {
      link.setAttribute(ORIGINAL, link.getAttribute("href") ?? "");
      link.setAttribute(ORIGINAL_TYPE, link.getAttribute("type") ?? "");
    }
    if (dataUrl) {
      link.setAttribute("href", dataUrl);
      const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1];
      if (mime) link.setAttribute("type", mime);
    } else {
      const href = link.getAttribute(ORIGINAL) ?? "";
      const type = link.getAttribute(ORIGINAL_TYPE) ?? "";
      if (href) link.setAttribute("href", href);
      else link.removeAttribute("href");
      if (type) link.setAttribute("type", type);
      else link.removeAttribute("type");
    }
  }
}

/** Keeps the browser tab's favicon in sync with Settings. Render once per page tree. */
export function BrandEffects() {
  const { settings } = useERP();
  useEffect(() => {
    applyFavicon(settings.faviconDataUrl);
  }, [settings.faviconDataUrl]);
  return null;
}
