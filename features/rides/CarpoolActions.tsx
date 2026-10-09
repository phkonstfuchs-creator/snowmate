"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelCarpoolAction,
  leaveCarpoolAction,
  requestCarpoolAction,
  respondCarpoolRequestAction,
  type CommandResult,
} from "./actions";
import type { CarpoolRequest, CarpoolDetail } from "./dto";
type Props = {
  carpoolId: string;
  role: CarpoolDetail["role"];
  availableSeats: number;
  isHost: boolean;
  isMember: boolean;
  status: CarpoolDetail["status"];
  requests: CarpoolRequest[];
  requestsUnavailable?: boolean;
  canRequest?: boolean;
};
const buttonClass = "w-full py-3 px-4 font-black text-sm disabled:opacity-50";
const buttonStyle = {
  background: "var(--accent-primary)",
  color: "var(--text-on-accent)",
};
export default function CarpoolActions({
  carpoolId,
  role,
  availableSeats,
  isHost,
  isMember,
  status,
  requests,
  requestsUnavailable,
  canRequest = true,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const retryKey = useRef<{
    intent: string;
    key: string;
  } | null>(null);
  const active = status === "scheduled" || status === "active";
  const myRequest = requests[0];
  function run(
    command: (key: string) => Promise<CommandResult>,
    success: string,
    intent = success,
  ) {
    const key =
      retryKey.current?.intent === intent
        ? retryKey.current.key
        : crypto.randomUUID();
    retryKey.current = { intent, key };
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await command(key);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        retryKey.current = null;
        setMessage(success);
        router.refresh();
      } catch {
        setError(
          "Die Änderung konnte nicht gespeichert werden. Versuche es erneut.",
        );
      }
    });
  }
  const request = () =>
    run(
      (idempotencyKey) => requestCarpoolAction({ carpoolId, idempotencyKey }),
      "Anfrage gespeichert. Warte auf die Bestätigung.",
    );
  const leave = () =>
    run(
      (idempotencyKey) => leaveCarpoolAction({ carpoolId, idempotencyKey }),
      "Mitfahrt verlassen.",
    );
  return (
    <div className="space-y-3" aria-busy={pending}>
      {error && (
        <p
          role="alert"
          className="text-sm font-bold"
          style={{ color: "var(--rust)" }}
        >
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="text-sm font-bold">
          {message}
        </p>
      )}

      {requestsUnavailable && (
        <p role="alert">
          Anfragen konnten nicht geladen werden. Bitte lade die Seite erneut.
        </p>
      )}

      {!active ? (
        <p role="status">
          {status === "cancelled"
            ? "Diese Mitfahrt wurde abgesagt."
            : "Diese Mitfahrt ist abgeschlossen."}
        </p>
      ) : isHost ? (
        <>
          <h2 className="font-black">Anfragen</h2>

          {!requestsUnavailable &&
            requests.filter((r) => r.status === "pending").length === 0 && (
              <p className="text-sm">Noch keine offenen Anfragen.</p>
            )}

          {requests
            .filter((r) => r.status === "pending")
            .map((r) => (
              <div
                key={r.id}
                className="p-3 space-y-2"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <p className="font-bold">{r.requester.displayName}</p>
                <div className="flex gap-2">
                  {[true, false].map((accept) => (
                    <button
                      key={String(accept)}
                      className={buttonClass}
                      style={buttonStyle}
                      disabled={
                        pending ||
                        (accept &&
                          (!canRequest ||
                            (role === "driver" && availableSeats === 0)))
                      }
                      onClick={() =>
                        run(
                          (idempotencyKey) =>
                            respondCarpoolRequestAction({
                              requestId: r.id,
                              accept,
                              idempotencyKey,
                            }),
                          accept ? "Anfrage bestätigt." : "Anfrage abgelehnt.",
                          `${r.id}:${accept}`,
                        )
                      }
                    >
                      {accept ? "Annehmen" : "Ablehnen"}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          <button
            className={buttonClass}
            disabled={pending}
            onClick={() => {
              if (window.confirm("Diese Mitfahrt für alle absagen?"))
                run(
                  (idempotencyKey) =>
                    cancelCarpoolAction({ carpoolId, idempotencyKey }),
                  "Mitfahrt abgesagt.",
                );
            }}
          >
            Mitfahrt absagen
          </button>
        </>
      ) : isMember ? (
        <>
          <p className="font-bold">
            {role === "driver"
              ? "Dein Platz ist bestätigt."
              : "Dein Fahrtangebot ist bestätigt."}
          </p>
          <button
            className={buttonClass}
            style={buttonStyle}
            disabled={pending}
            onClick={leave}
          >
            Mitfahrt verlassen
          </button>
        </>
      ) : myRequest?.status === "pending" ? (
        <>
          <p role="status">Anfrage offen · noch keine Bestätigung</p>
          <button className={buttonClass} disabled={pending} onClick={leave}>
            Anfrage zurückziehen
          </button>
        </>
      ) : !canRequest ? (
        <p>Für diese Mitfahrt sind keine neuen Anfragen mehr möglich.</p>
      ) : (
        <>
          {myRequest?.status === "declined" && (
            <p>Deine Anfrage wurde abgelehnt.</p>
          )}

          <button
            className={buttonClass}
            style={buttonStyle}
            disabled={
              pending ||
              requestsUnavailable ||
              (role === "driver" && availableSeats === 0)
            }
            onClick={request}
          >
            {pending
              ? "Wird gespeichert …"
              : role === "rider"
                ? "Fahrt anbieten"
                : availableSeats === 0
                  ? "Keine Plätze frei"
                  : "Platz anfragen"}
          </button>
        </>
      )}
    </div>
  );
}
