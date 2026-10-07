import { deletePushSubscriptionAction } from "./actions";

/** Disconnect only this browser before its account session ends. */
export async function removePushOnSignOut(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    try {
      await deletePushSubscriptionAction(subscription.endpoint);
    } finally {
      // Revoking the browser endpoint also protects a shared device if the
      // database request failed. The push service will reject future sends.
      await subscription.unsubscribe().catch(() => false);
    }
  } catch {
    // Sign-out must still complete if the browser has no usable push service.
  }
}
