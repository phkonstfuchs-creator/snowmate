"use client";

import Avatar from "@/components/ui/Avatar";
import Sheet from "@/components/ui/Sheet";
import { initialsFor } from "@/features/profile/profile-input";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import type { AbilityLevel, City } from "@/lib/types";

export interface ChatPerson {
  id: string;
  name: string;
  handle?: string | null;
  city?: City | null;
  abilityLevel?: AbilityLevel | null;
}

const ABILITY_LABEL: Record<AbilityLevel, MessageKey> = {
  chill: "common.chill",
  park: "common.park",
  "off-piste": "common.offPiste",
};
const CITY_LABEL: Record<City, string> = { innsbruck: "Innsbruck", salzburg: "Salzburg" };

/* Only details already authorized and supplied by the chat page. The
   avatar endpoint independently applies its audience rules. */
export default function ChatPersonSheet({ person, onClose, onSafety }: {
  person: ChatPerson;
  onClose: () => void;
  onSafety?: (person: ChatPerson) => void;
}) {
  const t = useT();
  return (
    <Sheet title={person.name} subtitle={t("nav.profile")} onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar id={person.id} initials={initialsFor(person.name, person.handle ?? null)} size={64} />
        <div className="space-y-1 text-sm" style={{ color: "var(--ink-2)" }}>
          {person.handle && <p>@{person.handle}</p>}
          {person.city && <p>{CITY_LABEL[person.city]}</p>}
          {person.abilityLevel && <p>{t(ABILITY_LABEL[person.abilityLevel])}</p>}
        </div>
      </div>
      {onSafety && (
        <button type="button" onClick={() => onSafety(person)} className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold" style={{ background: "var(--paper-2)", color: "var(--ink-0)" }}>
          {t("ride.reportOrBlock", { name: person.name })}
        </button>
      )}
    </Sheet>
  );
}
