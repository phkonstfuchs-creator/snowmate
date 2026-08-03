"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

export function useDialogFocus<T extends HTMLElement>(onClose: () => void, enabled = true) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const [firstFocusable] = getFocusableElements(dialog);
    (firstFocusable ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      const first = focusableElements.at(0);
      const last = focusableElements.at(-1);

      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const activeElement = document.activeElement;
      const focusIsOutside = !dialog.contains(activeElement);

      if (event.shiftKey && (activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [enabled]);

  return dialogRef;
}
