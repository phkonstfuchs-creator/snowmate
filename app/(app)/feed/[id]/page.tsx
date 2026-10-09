import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getRideDetail,
  getRideMembers,
  getRideRequests,
} from "@/features/rides/data";
import {
  cancelRideAction,
  leaveRideAction,
  requestRideAction,
  respondRideRequestAction,
} from "@/features/rides/actions";
import RideCommandButton from "@/features/rides/RideCommandButton";
import RideMeetingPoint from "@/features/rides/RideMeetingPoint";
import ConditionalInterest from "@/features/go/ConditionalInterest";
import { getGoStatus } from "@/features/go/data";
export default async function RideDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await getRideDetail(id);
  if (detail.status === "not-found") notFound();
  if (detail.status === "unavailable")
    return (
      <div className="p-4 space-y-3">
        <Link href="/feed">← Ausfahrten</Link>
        <p role="alert">Diese Ausfahrt ist gerade nicht verfügbar.</p>
        <Link href={`/feed/${id}`} className="underline">
          Erneut laden
        </Link>
      </div>
    );
  const ride = detail.data;
  let currentUserId: string | undefined;
  try {
    const client = await createClient();
    const claims = await client.auth.getClaims();
    if (!claims.error && typeof claims.data?.claims?.sub === "string")
      currentUserId = claims.data.claims.sub;
  } catch {
    /* No identity means no actionable controls. */
  }
  const [members, requests, go] = await Promise.all([
    getRideMembers(id),
    getRideRequests(id),
    getGoStatus(id),
  ]);
  const host = currentUserId === ride.host.id;
  const ownRequest =
    requests.status === "ready"
      ? requests.data.find((request) => request.requester.id === currentUserId)
      : undefined;
  const joined =
    members.status === "ready" &&
    members.data.some((member) => member.profile.id === currentUserId);
  // Server-rendered availability is checked again by the database on every write.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const scheduled =
    ride.status === "scheduled" && Date.parse(ride.startsAt) > now;
  const canRequest =
    scheduled &&
    ride.takenSpots < ride.capacity &&
    !host &&
    !joined &&
    ownRequest?.status !== "pending" &&
    ownRequest?.status !== "accepted";
  const controlsReady =
    Boolean(currentUserId) &&
    members.status === "ready" &&
    requests.status === "ready";
  const hasGoInterest =
    go.status === "ready" && go.data !== null && go.data.status !== "withdrawn";
  const carpoolHref = `/carpool?city=${ride.city}&resort=${ride.resort.id}`;
  return (
    <div className="p-4 space-y-5">
      <Link href={`/feed?city=${ride.city}`} className="underline">
        ← Ausfahrten
      </Link>
      <section
        className="p-4 space-y-3"
        style={{
          background: "var(--paper-0)",
          border: "var(--rule-thin)",
          boxShadow: "var(--shadow-print)",
        }}
      >
        <p className="text-mono-label">Geplant von {ride.host.displayName}</p>
        <h1 className="text-2xl font-bold">{ride.resort.name}</h1>
        <p>
          {new Intl.DateTimeFormat("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
          }).format(new Date(ride.startsAt))}
        </p>
        <p>
          {ride.takenSpots} / {ride.capacity} Plätze bestätigt ·{" "}
          {ride.abilityLevel === "off-piste"
            ? "Off-Piste"
            : ride.abilityLevel === "park"
              ? "Park"
              : "Chill"}
        </p>
        <p>
          {ride.status === "cancelled"
            ? "Ausfahrt abgesagt"
            : ride.status === "completed"
              ? "Ausfahrt abgeschlossen"
              : ride.status === "active"
                ? "Ausfahrt aktiv"
                : "Ausfahrt geplant"}
        </p>
        {ride.caption && <p>{ride.caption}</p>}
        <h2 className="font-bold">Treffpunkt</h2>
        <RideMeetingPoint
          canViewExact={ride.canViewExact}
          meetingPoint={ride.meetingPoint}
        />
      </section>
      {!controlsReady ? (
        <p role="alert">
          Teilnahmen und Anfragen gerade nicht verfügbar. Lade die Seite erneut.
        </p>
      ) : (
        <>
          {host ? (
            <p role="status">Du organisierst diese Ausfahrt.</p>
          ) : joined || ownRequest?.status === "accepted" ? (
            <p role="status">Du bist bestätigt dabei.</p>
          ) : ownRequest?.status === "pending" ? (
            <p role="status">
              Anfrage gesendet – die Bestätigung steht noch aus.
            </p>
          ) : ownRequest?.status === "declined" ? (
            <p>Deine letzte Anfrage wurde abgelehnt.</p>
          ) : ownRequest?.status === "cancelled" ? (
            <p>Deine Anfrage wurde zurückgezogen.</p>
          ) : null}
          {canRequest && go.status === "ready" && !hasGoInterest && (
            <RideCommandButton
              action={requestRideAction}
              input={{ rideId: id }}
              label="Teilnahme anfragen"
              success="Anfrage gesendet – warte auf die Bestätigung."
            />
          )}
          {!host &&
            (joined ||
              ownRequest?.status === "pending" ||
              ownRequest?.status === "accepted") &&
            (ride.status === "scheduled" || ride.status === "active") && (
              <RideCommandButton
                action={leaveRideAction}
                input={{ rideId: id }}
                label={
                  ownRequest?.status === "pending"
                    ? "Anfrage zurückziehen"
                    : "Teilnahme absagen"
                }
                success="Deine Teilnahme oder Anfrage wurde zurückgezogen."
              />
            )}
          {host &&
            (ride.status === "scheduled" || ride.status === "active") && (
              <RideCommandButton
                action={cancelRideAction}
                input={{ rideId: id }}
                label="Ausfahrt absagen"
                success="Ausfahrt abgesagt."
              />
            )}
          {!host &&
            scheduled &&
            ride.takenSpots >= ride.capacity &&
            !joined &&
            ownRequest?.status !== "pending" && (
              <p>Alle Plätze sind bereits belegt.</p>
            )}
        </>
      )}

      {controlsReady && !host && (scheduled || hasGoInterest) && (
        <ConditionalInterest
          key={go.status === "ready" ? JSON.stringify(go.data) : "unavailable"}
          rideId={id}
          capacity={ride.capacity}
          result={go}
          editable={
            scheduled &&
            !joined &&
            ownRequest?.status !== "pending" &&
            ownRequest?.status !== "accepted"
          }
          canRequest={canRequest}
          carpoolHref={carpoolHref}
        />
      )}

      {members.status === "ready" && members.data.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Bestätigte Crew</h2>
          <ul className="space-y-2">
            {members.data.map((member) => (
              <li key={member.profile.id}>
                {member.profile.displayName}
                {member.role === "host" ? " · Organisation" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      {host && requests.status === "ready" && (
        <section className="space-y-3">
          <h2 className="font-bold">Teilnahmeanfragen</h2>
          {requests.data.filter((request) => request.status === "pending")
            .length === 0 && <p>Keine offenen Anfragen.</p>}
          {requests.data
            .filter((request) => request.status === "pending")
            .map((request) => (
              <div
                key={request.id}
                className="p-3 space-y-3"
                style={{ border: "var(--rule-thin)" }}
              >
                <p className="font-bold">{request.requester.displayName}</p>
                {scheduled && (
                  <div className="flex flex-wrap gap-2">
                    <RideCommandButton
                      action={respondRideRequestAction}
                      input={{ requestId: request.id, accept: true }}
                      label="Annehmen"
                      success="Teilnahme bestätigt."
                      disabled={ride.takenSpots >= ride.capacity}
                    />
                    <RideCommandButton
                      action={respondRideRequestAction}
                      input={{ requestId: request.id, accept: false }}
                      label="Ablehnen"
                      success="Anfrage abgelehnt."
                    />
                  </div>
                )}
              </div>
            ))}
        </section>
      )}
      <Link href={carpoolHref} className="block underline font-bold">
        Mitfahrt zu diesem Skigebiet finden →
      </Link>
    </div>
  );
}
