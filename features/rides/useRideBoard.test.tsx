import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PUBLIC_EVENTS } from "@/lib/data";
import { useRideBoard } from "./useRideBoard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({}));

const REFERENCE = "2026-10-09T21:59:59.000Z"; // Friday 23:59:59 in Vienna.
function Dates() {
  const board = useRideBoard(undefined, PUBLIC_EVENTS, REFERENCE);
  return <p>{board.rides[0]?.post.date}</p>;
}

afterEach(() => vi.useRealTimers());

it("hydrates the same demo date when Vienna midnight passes after the server render", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(REFERENCE));
  const container = document.createElement("div");
  container.innerHTML = renderToString(<Dates />);
  const serverText = container.textContent;
  expect(serverText).toBe("Tomorrow");
  vi.setSystemTime(new Date("2026-10-09T22:00:01.000Z"));
  const recover = vi.fn();
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, <Dates />, { onRecoverableError: recover }); });
  try {
    expect(container.textContent).toBe(serverText);
    expect(recover).not.toHaveBeenCalled();
  } finally {
    act(() => root!.unmount());
  }
});
