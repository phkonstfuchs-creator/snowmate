import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  blockUserAction,
  createCrewAction,
  inviteCrewMemberAction,
  requestFriendshipAction,
  respondCrewInvitationAction,
  respondFriendshipAction,
  unblockUserAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const rpc = vi.fn();
const resourceId = "10000000-0000-4000-8000-000000000001";
const targetId = "20000000-0000-4000-8000-000000000001";
const idempotencyKey = "30000000-0000-4000-8000-000000000001";

describe("social commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: resourceId, error: null });
  });

  it("requests friendship without a caller-controlled user id", async () => {
    await requestFriendshipAction({ targetId, idempotencyKey });

    expect(rpc).toHaveBeenCalledWith("request_friendship", {
      p_idempotency_key: idempotencyKey,
      p_invite_token: null,
      p_target_id: targetId,
    });
  });

  it("responds to friendship using an explicit boolean", async () => {
    await respondFriendshipAction({
      friendshipId: resourceId,
      accept: true,
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("respond_friendship", {
      p_accept: true,
      p_friendship_id: resourceId,
      p_idempotency_key: idempotencyKey,
    });
  });

  it("uses idempotent command RPCs for block and unblock", async () => {
    await blockUserAction({ targetId, idempotencyKey });
    expect(rpc).toHaveBeenLastCalledWith("block_user", {
      p_idempotency_key: idempotencyKey,
      p_target_id: targetId,
    });

    await unblockUserAction({ targetId, idempotencyKey });
    expect(rpc).toHaveBeenLastCalledWith("unblock_user", {
      p_idempotency_key: idempotencyKey,
      p_target_id: targetId,
    });
  });

  it("normalizes crew names before sending the command", async () => {
    await createCrewAction({
      name: "  Weekend Crew  ",
      city: "innsbruck",
      idempotencyKey,
    });

    expect(rpc).toHaveBeenCalledWith("create_crew", {
      p_city: "innsbruck",
      p_idempotency_key: idempotencyKey,
      p_name: "Weekend Crew",
    });
  });

  it("rejects invalid input before opening a database client", async () => {
    const result = await blockUserAction({ targetId: "invalid" });

    expect(result.ok).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("invites and responds to crew membership through command RPCs", async () => {
    await inviteCrewMemberAction({
      crewId: resourceId,
      targetId,
      idempotencyKey,
    });
    expect(rpc).toHaveBeenLastCalledWith("invite_crew_member", {
      p_crew_id: resourceId,
      p_idempotency_key: idempotencyKey,
      p_target_id: targetId,
    });

    await respondCrewInvitationAction({
      invitationId: resourceId,
      accept: true,
      idempotencyKey,
    });
    expect(rpc).toHaveBeenLastCalledWith("respond_crew_invitation", {
      p_accept: true,
      p_idempotency_key: idempotencyKey,
      p_invitation_id: resourceId,
    });
  });
});
