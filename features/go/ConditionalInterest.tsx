"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestRideAction } from "@/features/rides/actions";
import type { DataResult } from "@/features/rides/data";
import type { CommandResult } from "@/lib/supabase/commands";
import { setGoInterestAction, withdrawGoInterestAction } from "./actions";
import type { GoStatus } from "./dto";
import { setGoInterestInputSchema } from "./schema";

export default function ConditionalInterest({
  rideId,
  capacity,
  result,
  editable,
  canRequest,
  carpoolHref,
}: {
  rideId: string;
  capacity: number;
  result: DataResult<GoStatus | null>;
  editable: boolean;
  canRequest: boolean;
  carpoolHref: string;
}) {
  const router = useRouter();
  const current = result.status === "ready" ? result.data : null;
  const [minimumGroup, setMinimumGroup] = useState(current?.minimumGroup ?? 2);
  const [needsCarpool, setNeedsCarpool] = useState(
    current?.needsCarpool ?? false,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const busy = useRef(false);
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  async function run(command: "save" | "withdraw" | "request") {
    if (busy.current) return;
    const fingerprint = JSON.stringify({
      command,
      rideId,
      minimumGroup,
      needsCarpool,
    });
    const key =
      retry.current?.fingerprint === fingerprint
        ? retry.current.key
        : crypto.randomUUID();
    retry.current = { fingerprint, key };
    const base = { rideId, idempotencyKey: key };
    const payload = { ...base, minimumGroup, needsCarpool };
    if (
      command === "save" &&
      !setGoInterestInputSchema.safeParse(payload).success
    ) {
      setSuccess(false);
      setMessage("Prüfe deine Bedingungen.");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response: CommandResult =
        command === "save"
          ? await setGoInterestAction(payload)
          : command === "withdraw"
            ? await withdrawGoInterestAction(base)
            : await requestRideAction(base);
      setSuccess(response.ok);
      setMessage(
        response.ok
          ? command === "save"
            ? "Bedingungen gespeichert. Deine Teilnahme bleibt offen."
            : command === "withdraw"
              ? "Interesse zurückgezogen."
              : "Anfrage gespeichert. Der Gastgeber bestätigt deine Teilnahme."
          : response.message,
      );
      if (response.ok) {
        retry.current = null;
        router.refresh();
      }
    } catch {
      setSuccess(false);
      setMessage(
        "Die Änderung konnte nicht gespeichert werden. Versuche es erneut.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const active = current && current.status !== "withdrawn";
  const expired = current?.status === "expired";
  const allowEdit = editable && !expired;
  return (
    <section className="card p-4 space-y-3" aria-label="Pistl Go">
      <h2 className="font-bold text-lg">Pistl Go · Ich fahre mit, wenn …</h2>
      <p className="text-sm">
        Lege deine Bedingungen fest. Interesse reserviert keinen Platz; du
        fragst deine Teilnahme anschließend selbst an.
      </p>
      <p className="text-sm">
        Deine eigene Zusage zählt zur Mindestgruppe; offene Interessen anderer
        zählen nicht.
      </p>
      {result.status === "unavailable" ? (
        <p role="alert">
          Deine Bedingungen sind gerade nicht verfügbar. Lade die Seite erneut.
        </p>
      ) : (
        <>
          {active && (
            <div className="text-sm space-y-1">
              <p>
                {current.confirmedGroup} bereits bestätigt · Mindestgruppe{" "}
                {current.minimumGroup} inklusive dir.
              </p>
              {current.needsCarpool && (
                <p>
                  {current.hasConfirmedCarpool
                    ? "Dein Mitfahrplatz ist bestätigt."
                    : "Noch kein bestätigter Mitfahrplatz für diese Ausfahrt."}
                </p>
              )}
              <p>
                {expired
                  ? "Dein Interesse ist abgelaufen."
                  : current.status === "confirmed"
                    ? "Teilnahme bestätigt."
                    : current.status === "requested"
                      ? "Teilnahme angefragt; Bestätigung des Gastgebers steht aus."
                      : current.ready
                        ? "Deine Bedingungen sind erfüllt. Du kannst deine Teilnahme anfragen."
                        : "Deine Bedingungen sind noch offen."}
              </p>
              {(current.status === "confirmed" ||
                current.status === "requested") &&
                !current.ready && (
                  <p role="alert">
                    Eine Bedingung ist wieder offen. Prüfe deine Teilnahme und
                    Mitfahrt erneut.
                  </p>
                )}
              {current.needsCarpool &&
                !current.hasConfirmedCarpool &&
                !expired && (
                  <a className="underline" href={carpoolHref}>
                    Mitfahrt organisieren
                  </a>
                )}
            </div>
          )}
          {allowEdit && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void run("save");
              }}
            >
              <label className="block text-sm">
                Mindestgruppe inklusive dir und Gastgeber
                <select
                  className="block w-full p-2"
                  aria-label="Mindestgruppe inklusive dir und Gastgeber"
                  value={minimumGroup}
                  disabled={pending}
                  onChange={(event) =>
                    setMinimumGroup(Number(event.target.value))
                  }
                >
                  {Array.from(
                    { length: Math.max(0, Math.min(capacity, 12) - 1) },
                    (_, index) => index + 2,
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value} Personen
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={needsCarpool}
                  disabled={pending}
                  onChange={(event) => setNeedsCarpool(event.target.checked)}
                />
                Ich brauche einen bestätigten Mitfahrplatz
              </label>
              <button
                className="card-tap px-4 py-3 font-bold"
                disabled={pending}
                type="submit"
              >
                Bedingungen speichern
              </button>
            </form>
          )}
          {allowEdit && active && (
            <button
              type="button"
              disabled={pending}
              className="underline text-sm"
              onClick={() => void run("withdraw")}
            >
              Bedingungen zurückziehen
            </button>
          )}
          {canRequest &&
            active &&
            current.status === "ready" &&
            current.ready && (
              <button
                type="button"
                disabled={pending}
                className="card-tap px-4 py-3 font-bold"
                onClick={() => void run("request")}
              >
                Teilnahme anfragen
              </button>
            )}
        </>
      )}
      {message && (
        <p role={success ? "status" : "alert"} className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
