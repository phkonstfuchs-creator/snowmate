import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatPersonSheet from "./ChatPersonSheet";

const person = { id: "c4a70000-0000-4000-8000-000000000002", name: "Lena Moser", handle: "lena", city: "innsbruck" as const, abilityLevel: "park" as const };

describe("ChatPersonSheet", () => {
  it("shows only supplied person details and requests the protected avatar route", () => {
    const { container } = render(<ChatPersonSheet person={person} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Lena Moser" })).toBeInTheDocument();
    expect(screen.getByText("@lena")).toBeInTheDocument();
    expect(screen.getByText("Innsbruck")).toBeInTheDocument();
    expect(screen.getByText("Park")).toBeInTheDocument();
    expect(new URL(container.querySelector("img")!.getAttribute("src")!, window.location.href).pathname).toBe(`/avatar/${person.id}`);
    expect(screen.queryByRole("button", { name: /Report or block/ })).not.toBeInTheDocument();
  });

  it("does not fabricate missing handle, region, ability, stats or age", () => {
    render(<ChatPersonSheet person={{ id: person.id, name: "Lena" }} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Lena" })).toBeInTheDocument();
    expect(screen.queryByText("Innsbruck")).not.toBeInTheDocument();
    expect(screen.queryByText("Park")).not.toBeInTheDocument();
    expect(screen.queryByText(/@|XP|18\+|Under 18/)).not.toBeInTheDocument();
  });

  it("offers report or block only when supplied and passes the authorized target", () => {
    const onSafety = vi.fn();
    render(<ChatPersonSheet person={person} onClose={vi.fn()} onSafety={onSafety} />);
    fireEvent.click(screen.getByRole("button", { name: "Report or block Lena Moser" }));
    expect(onSafety).toHaveBeenCalledWith(person);
  });

  it("closes with Escape", async () => {
    const onClose = vi.fn();
    render(<ChatPersonSheet person={person} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("closes with the accessible close button", async () => {
    const onClose = vi.fn();
    render(<ChatPersonSheet person={person} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
