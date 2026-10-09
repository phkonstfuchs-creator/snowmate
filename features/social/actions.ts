"use server";

import {
  executeUuidCommand,
  invalidCommandInput,
  type CommandResult,
} from "@/lib/supabase/commands";
import {
  blockUserSchema,
  createCrewSchema,
  crewInvitationResponseSchema,
  friendshipRequestSchema,
  friendshipResponseSchema,
  inviteCrewMemberSchema,
  unblockUserSchema,
} from "./schema";

export async function requestFriendshipAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = friendshipRequestSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "request_friendship",
    {
      p_target_id: validation.data.targetId,
      p_idempotency_key: validation.data.idempotencyKey,
      p_invite_token: validation.data.inviteToken ?? null,
    },
    "/crew",
  );
}

export async function respondFriendshipAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = friendshipResponseSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "respond_friendship",
    {
      p_friendship_id: validation.data.friendshipId,
      p_accept: validation.data.accept,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}

export async function blockUserAction(input: unknown): Promise<CommandResult> {
  const validation = blockUserSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "block_user",
    {
      p_target_id: validation.data.targetId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}

export async function unblockUserAction(input: unknown): Promise<CommandResult> {
  const validation = unblockUserSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "unblock_user",
    {
      p_target_id: validation.data.targetId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}

export async function createCrewAction(input: unknown): Promise<CommandResult> {
  const validation = createCrewSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "create_crew",
    {
      p_name: validation.data.name,
      p_city: validation.data.city,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}

export async function inviteCrewMemberAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = inviteCrewMemberSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "invite_crew_member",
    {
      p_crew_id: validation.data.crewId,
      p_target_id: validation.data.targetId,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}

export async function respondCrewInvitationAction(
  input: unknown,
): Promise<CommandResult> {
  const validation = crewInvitationResponseSchema.safeParse(input);
  if (!validation.success) return invalidCommandInput();

  return executeUuidCommand(
    "respond_crew_invitation",
    {
      p_invitation_id: validation.data.invitationId,
      p_accept: validation.data.accept,
      p_idempotency_key: validation.data.idempotencyKey,
    },
    "/crew",
  );
}
