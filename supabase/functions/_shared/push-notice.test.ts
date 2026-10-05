import { describe, expect, it } from "vitest";
import { deviceIsGone, noticePayload, noticeTopic } from "./push-notice";

const notice = { kind: "message", actor_name: "Lena Moser", url: "/crew/chat/c4a70000-0000-4000-8000-0000000000aa" };

describe("push notices", () => {
  it("carry the kind, the name and the page, never more", () => {
    expect(JSON.parse(noticePayload(notice))).toEqual({ kind: "message", name: "Lena Moser", url: notice.url });
    expect(JSON.parse(noticePayload({ ...notice, actor_name: null })).name).toBe("");
    expect(JSON.parse(noticePayload({ ...notice, actor_name: "x".repeat(200) })).name).toHaveLength(60);
  });

  it("use a valid topic per page", () => {
    const topic = noticeTopic(notice);
    expect(topic).toMatch(/^[A-Za-z0-9_-]{1,32}$/u);
    expect(noticeTopic({ ...notice, url: "/crew/chat/other" })).not.toBe(topic);
  });

  it("forget devices only when the push service says they are gone", () => {
    expect([404, 410].every(deviceIsGone)).toBe(true);
    expect([201, 400, 413, 429, 500].some(deviceIsGone)).toBe(false);
  });
});
