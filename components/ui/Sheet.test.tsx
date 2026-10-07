import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Sheet from "./Sheet";

describe("Sheet", () => {
  it("is a labelled modal dialog that closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Sheet title="Neuer Post" onClose={onClose}><p>Inhalt</p></Sheet>);

    const dialog = screen.getByRole("dialog", { name: "Neuer Post" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("lets children close it and asks canClose first", async () => {
    const onClose = vi.fn();
    const canClose = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    render(
      <Sheet title="Skitag" onClose={onClose} canClose={canClose}>
        {(close) => <button type="button" onClick={close}>Fertig</button>}
      </Sheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(canClose).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
