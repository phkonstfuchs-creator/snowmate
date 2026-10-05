import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostList from "./PostList";
import type { Post } from "./post";

const mocks = vi.hoisted(() => ({ deletePostAction: vi.fn(), refresh: vi.fn() }));
vi.mock("./actions", () => ({ deletePostAction: mocks.deletePostAction }));
vi.mock("@/features/safety/actions", () => ({ reportUserAction: vi.fn(), blockUserAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const base: Post = {
  id: "c4a70000-0000-4000-8000-0000000000aa",
  authorId: "c4a70000-0000-4000-8000-000000000001",
  authorName: "Lena Moser",
  authorHandle: "lena_m",
  body: "Bluebird an der Nordkette",
  resort: "Nordkette",
  hasPhoto: true,
  createdAt: "2026-01-10T10:00:00Z",
  isMine: false,
};

describe("PostList", () => {
  it("shows nothing for an empty list and a notice when loading failed", () => {
    const { container } = render(<PostList posts={[]} title="From your crew" />);
    expect(container).toBeEmptyDOMElement();
    render(<PostList posts={null} title="From your crew" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a friend's post with photo and a report menu, but no delete", () => {
    render(<PostList posts={[base]} title="From your crew" />);
    expect(screen.getByText("Bluebird an der Nordkette")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo by Lena Moser" }).getAttribute("src")).toMatch(new RegExp(`/post-photo/${base.id}$`));
    expect(screen.queryByRole("button", { name: "Delete post" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lena Moser/ })).toBeInTheDocument();
  });

  it("deletes an own post after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.deletePostAction.mockResolvedValue(true);
    render(<PostList posts={[{ ...base, isMine: true, hasPhoto: false }]} title="Your posts" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete post" }));
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.deletePostAction).toHaveBeenCalledWith(base.id);
  });
});
