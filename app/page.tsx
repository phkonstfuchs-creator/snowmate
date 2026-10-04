import { redirect } from "next/navigation";

/* The app lives on app.pistl.app; the public website on pistl.app (the
   website/ project) introduces Pistl. Here the root goes straight into the
   app, and the proxy sends signed-out visitors to the login. */
export default function Home() {
  redirect("/feed");
}
