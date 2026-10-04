import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialProfileActionState } from "./action-state";
import { setBirthDateAction } from "./actions";
import { isBirthDateStatus, parseBirthDate } from "./birth-date";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

function setup(answer: { data: unknown; error: unknown } | "throws") {
  const rpc = vi.fn(async () => {
    if (answer === "throws") throw new Error("network");
    return answer;
  });
  mocks.createClient.mockResolvedValue({ rpc });
  return rpc;
}

function form(birthDate: string) {
  const data = new FormData();
  data.set("birthDate", birthDate);
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("parseBirthDate", () => {
  it.each([
    ["2007-02-29", null],
    ["2008-02-28", "2008-02-28"],
    [" 2004-02-29 ", "2004-02-29"],
    ["2004-13-01", null],
    ["01.02.2004", null],
    ["", null],
  ])("%j → %j", (input, expected) => {
    expect(parseBirthDate(input)).toBe(expected);
  });

  it("recognises only the database's answers", () => {
    expect(isBirthDateStatus("set")).toBe(true);
    expect(isBirthDateStatus("toString")).toBe(false);
    expect(isBirthDateStatus(1)).toBe(false);
  });
});

describe("setBirthDateAction", () => {
  it("sends only the date; identity comes from the session", async () => {
    const rpc = setup({ data: "set", error: null });
    const result = await setBirthDateAction(initialProfileActionState, form("2001-05-20"));
    expect(rpc).toHaveBeenCalledWith("set_my_birth_date", { p_birth_date: "2001-05-20" });
    expect(result).toEqual({ status: "success", message: "Saved." });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("refuses a malformed date before calling the database", async () => {
    const rpc = setup({ data: "set", error: null });
    const result = await setBirthDateAction(initialProfileActionState, form("2001-02-30"));
    expect(rpc).not.toHaveBeenCalled();
    expect(result.message).toBe("Enter a valid birth date.");
  });

  it.each([
    ["too_young", "Pistl is for riders aged 14 and over."],
    ["already_set", "Your birth date is already saved."],
    ["invalid", "Enter a valid birth date."],
    ["unauthenticated", "Your session ended. Sign in again."],
  ])("maps %s to a message", async (status, message) => {
    setup({ data: status, error: null });
    const result = await setBirthDateAction(initialProfileActionState, form("2015-01-01"));
    expect(result).toEqual({ status: "error", message });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [{ data: null, error: { code: "XX000" } }],
    [{ data: "surprise", error: null }],
    ["throws" as const],
  ])("fails closed on %j", async (answer) => {
    setup(answer);
    const result = await setBirthDateAction(initialProfileActionState, form("2001-05-20"));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/temporarily unavailable/);
  });
});
