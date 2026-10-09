import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getCarpoolDetail,
  getCarpoolMembers,
  getCarpoolRequests,
} from "@/features/rides/data";
import CarpoolActions from "@/features/rides/CarpoolActions";
import { createClient } from "@/lib/supabase/server";
export default async function CarpoolDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const result = await getCarpoolDetail(id);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready")
    return (
      <div className="p-5" role="alert">
        Mitfahrt konnte nicht geladen werden.
        <Link href={`/carpool/${id}`} className="underline">
          Erneut laden
        </Link>
      </div>
    );
  let currentUserId: string | undefined;
  try {
    const supabase = await createClient();
    const claims = await supabase.auth.getClaims();
    if (!claims.error && typeof claims.data?.claims?.sub === "string")
      currentUserId = claims.data.claims.sub;
  } catch {
    /* Identity failure keeps mutation controls unavailable. */
  }
  const [members, requests] = await Promise.all([
    getCarpoolMembers(id),
    getCarpoolRequests(id),
  ]);
  const detail = result.data;
  // The database also checks the departure window when applying commands.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const canRequest =
    detail.status === "scheduled" && Date.parse(detail.departsAt) > now;
  return (
    <div className="p-5 space-y-5">
      <Link
        href={`/carpool?city=${detail.city}`}
        className="font-bold underline"
      >
        ← Mitfahrten
      </Link>

      <div>
        <h1 className="font-display text-2xl font-black">
          {detail.resort.name}
        </h1>
        <p className="font-bold">
          {detail.host.displayName} ·
          {detail.role === "driver" ? "Fährt" : "Sucht einen Platz"}
        </p>
      </div>

      <p>
        {new Date(detail.departsAt).toLocaleString("de-AT", {
          timeZone: "Europe/Vienna",
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>

      <p className="font-bold">
        {detail.role === "driver"
          ? `${detail.availableSeats} von ${detail.seatCapacity} Plätzen frei`
          : "Platzsuche für eine Person"}
      </p>

      <div className="p-4" style={{ background: "var(--bg-surface-1)" }}>
        <h2 className="font-black">Abfahrtsort</h2>
        <p>
          {detail.canViewExact && detail.departurePoint
            ? detail.departurePoint
            : "Der genaue Abfahrtsort wird nach Bestätigung sichtbar."}
        </p>
      </div>

      {detail.note && <p>{detail.note}</p>}

      <section>
        <h2 className="font-black">Bestätigte Mitfahrer</h2>
        {members.status === "unavailable" ? (
          <p role="alert">Mitfahrer konnten nicht geladen werden.</p>
        ) : members.data.length === 0 ? (
          <p>Keine Mitfahrer für dich sichtbar.</p>
        ) : (
          <ul>
            {members.data.map((member) => (
              <li key={member.profile.id}>{member.profile.displayName}</li>
            ))}
          </ul>
        )}
      </section>

      {!currentUserId ? (
        <p role="alert">
          Deine Identität konnte nicht geprüft werden. Bitte lade die Seite
          erneut.
        </p>
      ) : (
        <CarpoolActions
          carpoolId={id}
          canRequest={canRequest}
          role={detail.role}
          availableSeats={detail.availableSeats}
          isHost={currentUserId === detail.host.id}
          isMember={
            members.status === "ready" &&
            members.data.some((member) => member.profile.id === currentUserId)
          }
          status={detail.status}
          requests={requests.status === "ready" ? requests.data : []}
          requestsUnavailable={
            requests.status === "unavailable" ||
            members.status === "unavailable"
          }
        />
      )}
    </div>
  );
}
