import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  parseBlockedProfileRows,
  parseCrewInvitationRows,
  parseCrewMemberRows,
  parseCrewRows,
  parseDiscoveryProfileRows,
  parseFriendshipRows,
  type BlockedProfile,
  type Crew,
  type CrewInvitation,
  type CrewMember,
  type DiscoveryProfile,
  type Friendship,
} from "./dto";

export type SocialDataResult<T> =
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "unavailable" }>;

async function getSocialRows<T>(
  rpcName: string,
  parse: (value: unknown) => T[] | null,
  args?: Record<string, unknown>,
): Promise<SocialDataResult<T[]>> {
  try {
    const supabase = await createClient();
    const response = args
      ? await supabase.rpc(rpcName, args)
      : await supabase.rpc(rpcName);
    if (response.error) return { status: "unavailable" };

    const parsed = parse(response.data);
    return parsed
      ? { status: "ready", data: parsed }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export function getDiscoveryProfiles(): Promise<
  SocialDataResult<DiscoveryProfile[]>
> {
  return getSocialRows("get_discovery_profiles", parseDiscoveryProfileRows);
}

export function getFriendships(): Promise<SocialDataResult<Friendship[]>> {
  return getSocialRows("get_friendships", parseFriendshipRows);
}

export function getBlockedProfiles(): Promise<
  SocialDataResult<BlockedProfile[]>
> {
  return getSocialRows("get_blocked_profiles", parseBlockedProfileRows);
}

export function getCrews(): Promise<SocialDataResult<Crew[]>> {
  return getSocialRows("get_crews", parseCrewRows);
}

export function getCrewMembers(
  crewId: string,
): Promise<SocialDataResult<CrewMember[]>> {
  const parsedId = z.uuid().safeParse(crewId);
  if (!parsedId.success) return Promise.resolve({ status: "unavailable" });

  return getSocialRows("get_crew_members", parseCrewMemberRows, {
    p_crew_id: parsedId.data,
  });
}

export function getCrewInvitations(): Promise<
  SocialDataResult<CrewInvitation[]>
> {
  return getSocialRows("get_crew_invitations", parseCrewInvitationRows);
}
