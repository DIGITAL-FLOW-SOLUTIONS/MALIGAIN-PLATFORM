const FOOTER_MARKERS = ["secured by", "report scam"];

function isHashPayFooter(element: HTMLElement) {
  const text = element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
  return FOOTER_MARKERS.every((marker) => text.includes(marker));
}

/**
 * HashPay adds its own "Secured by Report scam" footer after the iframe modal
 * is opened. Keep the payment UI intact while removing only that footer.
 */
export function removeHashPayScamFooter() {
  const removeFooter = () => {
    document.querySelectorAll<HTMLElement>(".hp-modal").forEach((modal) => {
      const candidates = Array.from(
        modal.querySelectorAll<HTMLElement>("div, footer, p, span, a"),
      );
      const footer = candidates.find(
        (element) =>
          isHashPayFooter(element) &&
          !Array.from(element.children).some((child) =>
            isHashPayFooter(child as HTMLElement),
          ),
      );

      footer?.remove();
    });
  };

  removeFooter();
  const observer = new MutationObserver(removeFooter);
  observer.observe(document.body, { childList: true, subtree: true });

  window.setTimeout(() => observer.disconnect(), 15_000);
}