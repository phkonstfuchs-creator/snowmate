import { beforeEach, describe, expect, it, vi } from "vitest";
import { isUuid, rpcOutcome } from "./server-action";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));

const KNOWN = ["done", "invalid"] as const;

beforeEach(() => vi.clearAllMocks());

describe("isUuid", () => {
  it("accepts only lowercase uuids", () => {
    expect(isUuid("c4a70000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("../x")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe("rpcOutcome", () => {
  it("passes known outcomes through and runs onAnswer", async () => {
    mocks.rpc.mockResolvedValue({ data: "done", error: null });
    const onAnswer = vi.fn();
    await expect(rpcOutcome("f", { a: 1 }, KNOWN, onAnswer)).resolves.toBe("done");
    expect(mocks.rpc).toHaveBeenCalledWith("f", { a: 1 });
    expect(onAnswer).toHaveBeenCalledWith("done", expect.anything());
  });

  it("turns unknown answers, errors and throws into unavailable", async () => {
    const onAnswer = vi.fn();
    mocks.rpc.mockResolvedValueOnce({ data: "<script>", error: null });
    await expect(rpcOutcome("f", undefined, KNOWN, onAnswer)).resolves.toBe("unavailable");
    mocks.rpc.mockResolvedValueOnce({ data: "done", error: { code: "42501" } });
    await expect(rpcOutcome("f", undefined, KNOWN, onAnswer)).resolves.toBe("unavailable");
    mocks.rpc.mockRejectedValueOnce(new Error("network"));
    await expect(rpcOutcome("f", undefined, KNOWN, onAnswer)).resolves.toBe("unavailable");
    expect(onAnswer).not.toHaveBeenCalled();

    mocks.rpc.mockResolvedValueOnce({ data: "done", error: null });
    await expect(rpcOutcome("f", undefined, KNOWN, () => { throw new Error("push"); })).resolves.toBe("unavailable");
  });
});
