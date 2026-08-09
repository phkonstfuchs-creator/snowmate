import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/* jsdom kennt matchMedia nicht. Ohne den Stub wirft jedes Sheet
   beim Schliessen, weil useSheetDismiss auf prefers-reduced-motion
   prueft. Standard ist "keine Reduktion", damit Tests denselben Weg
   nehmen wie ein normaler Browser. */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(cleanup);
