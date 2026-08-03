import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDialogFocus } from "@/hooks/useDialogFocus";

function TestDialog({ onClose, enabled = true }: { onClose: () => void; enabled?: boolean }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose, enabled);

  return (
    <div ref={dialogRef} role="dialog" tabIndex={-1}>
      <button type="button">Erste Aktion</button>
      <button type="button">Letzte Aktion</button>
    </div>
  );
}

describe("useDialogFocus", () => {
  it("manages initial focus, keyboard trapping, closing, and restoration", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(<TestDialog onClose={onClose} />);
    const firstAction = screen.getByRole("button", { name: "Erste Aktion" });
    const lastAction = screen.getByRole("button", { name: "Letzte Aktion" });

    expect(firstAction).toHaveFocus();

    lastAction.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstAction).toHaveFocus();

    firstAction.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastAction).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("does not intercept focus or keyboard events while paused", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    render(<TestDialog onClose={onClose} enabled={false} />);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(opener).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    opener.remove();
  });
});
