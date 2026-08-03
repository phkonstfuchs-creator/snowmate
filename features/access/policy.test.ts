import { describe, expect, it } from "vitest";
import {
  canDirectMessage,
  canDiscoverProfile,
  canDiscoverRide,
  canViewExactRideDetails,
  canViewLiveLocation,
  canViewResortPresence,
  type AccessContext,
} from "./policy";

const adult: AccessContext = {
  viewerId: "viewer",
  ownerId: "owner",
  viewerIsMinor: false,
  ownerIsMinor: false,
  relationship: "unrelated",
  isBlocked: false,
};

const minor: AccessContext = {
  ...adult,
  ownerIsMinor: true,
};

describe("Snowmate visibility policy", () => {
  it("lets an adult friend-of-friend discover only broad social data", () => {
    const context: AccessContext = {
      ...adult,
      relationship: "friend-of-friend",
    };

    expect(canDiscoverProfile(context)).toBe(true);
    expect(canDiscoverRide(context, "friends-of-friends")).toBe(true);
    expect(canViewResortPresence(context, "friends-of-friends")).toBe(true);
    expect(canViewExactRideDetails(context)).toBe(false);
    expect(canViewLiveLocation(context)).toBe(false);
    expect(canDirectMessage(context)).toBe(false);
  });

  it("does not treat a pending friendship as accepted", () => {
    const context: AccessContext = { ...adult, relationship: "pending" };

    expect(canDiscoverProfile(context)).toBe(false);
    expect(canViewExactRideDetails(context)).toBe(false);
    expect(canViewLiveLocation(context)).toBe(false);
    expect(canDirectMessage(context)).toBe(false);
  });

  it("reveals exact ride and live-location data after adult ride acceptance", () => {
    const context: AccessContext = {
      ...adult,
      relationship: "accepted-ride-participant",
    };

    expect(canViewExactRideDetails(context)).toBe(true);
    expect(canViewLiveLocation(context)).toBe(true);
    expect(canDirectMessage(context)).toBe(false);
  });

  it("keeps every minor surface within confirmed friendships", () => {
    const friendOfFriend: AccessContext = {
      ...minor,
      relationship: "friend-of-friend",
    };
    const acceptedRideParticipant: AccessContext = {
      ...minor,
      relationship: "accepted-ride-participant",
    };
    const friend: AccessContext = { ...minor, relationship: "friend" };

    for (const context of [friendOfFriend, acceptedRideParticipant]) {
      expect(canDiscoverProfile(context)).toBe(false);
      expect(canDiscoverRide(context, "friends-of-friends")).toBe(false);
      expect(canViewResortPresence(context, "friends-of-friends")).toBe(false);
      expect(canViewExactRideDetails(context)).toBe(false);
      expect(canViewLiveLocation(context)).toBe(false);
      expect(canDirectMessage(context)).toBe(false);
    }

    expect(canDiscoverProfile(friend)).toBe(true);
    expect(canDiscoverRide(friend, "friends")).toBe(true);
    expect(canViewResortPresence(friend, "friends")).toBe(true);
    expect(canViewExactRideDetails(friend)).toBe(true);
    expect(canViewLiveLocation(friend)).toBe(true);
    expect(canDirectMessage(friend)).toBe(true);
  });

  it("does not let a minor viewer use adult friend-of-friend discovery", () => {
    const context: AccessContext = {
      ...adult,
      viewerIsMinor: true,
      relationship: "friend-of-friend",
    };

    expect(canDiscoverProfile(context)).toBe(false);
    expect(canDiscoverRide(context, "friends-of-friends")).toBe(false);
    expect(canViewResortPresence(context, "friends-of-friends")).toBe(false);
  });

  it("lets owners access their own records", () => {
    const self: AccessContext = {
      ...minor,
      ownerId: "viewer",
      relationship: "unrelated",
    };

    expect(canDiscoverProfile(self)).toBe(true);
    expect(canDiscoverRide(self, "friends")).toBe(true);
    expect(canViewResortPresence(self, "friends")).toBe(true);
    expect(canViewExactRideDetails(self)).toBe(true);
    expect(canViewLiveLocation(self)).toBe(true);
  });

  it("makes a block override every other relationship", () => {
    const blocked: AccessContext = {
      ...adult,
      relationship: "friend",
      isBlocked: true,
    };

    expect(canDiscoverProfile(blocked)).toBe(false);
    expect(canDiscoverRide(blocked, "friends-of-friends")).toBe(false);
    expect(canViewResortPresence(blocked, "friends-of-friends")).toBe(false);
    expect(canViewExactRideDetails(blocked)).toBe(false);
    expect(canViewLiveLocation(blocked)).toBe(false);
    expect(canDirectMessage(blocked)).toBe(false);
  });
});
