import { redirect } from "next/navigation";

/* People search runs on fixtures and stays in /demo. Signed-in users add
   friends by handle on the crew screen instead: there is deliberately no
   open search over real accounts. */
export default function PeoplePage() {
  redirect("/crew");
}
