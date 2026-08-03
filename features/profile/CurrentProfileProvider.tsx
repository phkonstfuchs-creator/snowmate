"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import type { CompletedProfile } from "./model";
import { PROFILE_DRAFT_KEY } from "./draft-storage";

const CurrentProfileContext = createContext<CompletedProfile | null>(null);

interface CurrentProfileProviderProps {
  children: ReactNode;
  profile: CompletedProfile;
}

export function CurrentProfileProvider({
  children,
  profile,
}: CurrentProfileProviderProps) {
  useEffect(() => {
    window.sessionStorage.removeItem(PROFILE_DRAFT_KEY);
    window.localStorage.removeItem(PROFILE_DRAFT_KEY);
  }, []);

  return (
    <CurrentProfileContext.Provider value={profile}>
      {children}
    </CurrentProfileContext.Provider>
  );
}

export function useCurrentProfile(): CompletedProfile {
  const profile = useContext(CurrentProfileContext);

  if (!profile) {
    throw new Error(
      "useCurrentProfile must be used inside CurrentProfileProvider.",
    );
  }

  return profile;
}
