import type { RidePost, User, VisibleRide } from "@/lib/types";

/* Gestufte Sichtbarkeit fuer Ausfahrten.
 *
 * Die Regel lautet ueberall gleich: das Gebiet sieht jeder, den
 * genauen Treffpunkt erst, wer zugesagt hat. Bei oeffentlichen
 * Events wiegt das schwerer, weil dort auch Fremde mitlesen.
 *
 * ACHTUNG: Das hier ist Darstellung, keine Durchsetzung. Solange
 * der Server den Treffpunkt mitliefert, steht er trotzdem in der
 * API-Antwort. Die serverseitige Regel ist in
 * docs/BACKEND_REQUESTS.md als Punkt 5 angefordert.
 */

interface ViewerContext {
  viewer: User;
  /* Autoren-Objekt, damit die Minderjaehrigen-Regel ohne einen
     zweiten Lookup auskommt */
  author: User;
  isJoined: boolean;
  friendIds: readonly string[];
}

/* Minderjaehrige duerfen nicht oeffentlich an Fremde ausspielen.
   Das ist dieselbe Regel wie im README: Profile, Ausfahrten,
   Standorte und Nachrichten Minderjaehriger laufen ueber das
   engere Publikum "bestaetigte Freunde". */
export function canPostPublicRide(user: Pick<User, "isMinor">): boolean {
  return !user.isMinor;
}

/* Eine oeffentliche Ausfahrt einer minderjaehrigen Person ist ein
   Datenfehler, kein gueltiger Zustand. Wir zeigen sie in der
   oeffentlichen Liste nicht an, statt uns auf die Eingabe zu
   verlassen. */
export function isDiscoverablePublicRide(
  post: Pick<RidePost, "visibility">,
  author: Pick<User, "isMinor">,
): boolean {
  return post.visibility === "public" && canPostPublicRide(author);
}

export function canSeeMeetingPoint({
  viewer,
  author,
  isJoined,
  friendIds,
}: ViewerContext): boolean {
  if (viewer.id === author.id) return true;
  if (isJoined) return true;

  /* Bei "friends" traegt schon die Freundschaft; bei "public"
     nicht, sonst waere die Zusage wirkungslos. */
  return friendIds.includes(author.id);
}

export function toVisibleRide(
  post: RidePost,
  context: ViewerContext,
): VisibleRide {
  const { meetPoint, ...rest } = post;

  const unlocked =
    post.visibility === "friends"
      ? canSeeMeetingPoint(context)
      : context.viewer.id === context.author.id || context.isJoined;

  return {
    post: rest,
    meetPoint: unlocked ? meetPoint : null,
    meetPointLocked: !unlocked,
  };
}
