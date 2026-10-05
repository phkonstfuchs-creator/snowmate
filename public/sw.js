/* Pistl service worker: shows push notices (ADR 0025). A notice carries
   only its kind, a name and the page to open; the sentence is made here,
   in the device's language. No caching, no offline mode. */

const TEXT = {
  de: {
    message: "{name} hat dir geschrieben",
    friend_request: "{name} möchte mit dir befreundet sein",
    friend_accepted: "{name} ist jetzt in deiner Crew",
    ride_request: "{name} möchte bei deinem Ride mitfahren",
    ride_joined: "{name} fährt bei deinem Ride mit",
    ride_accepted: "{name} hat dich in den Ride gelassen",
    fallback: "Neues in deiner Crew",
    someone: "Jemand",
  },
  en: {
    message: "{name} sent you a message",
    friend_request: "{name} wants to be friends",
    friend_accepted: "{name} is now in your crew",
    ride_request: "{name} asked to join your ride",
    ride_joined: "{name} joined your ride",
    ride_accepted: "{name} let you into the ride",
    fallback: "Something new in your crew",
    someone: "Someone",
  },
};

function safePath(value) {
  return typeof value === "string" && /^\/[A-Za-z0-9/_-]{0,120}$/.test(value) ? value : "/feed";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const lang = (self.navigator.language || "en").toLowerCase().startsWith("de") ? TEXT.de : TEXT.en;
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 60) : lang.someone;
  const template = Object.prototype.hasOwnProperty.call(lang, data.kind) && data.kind !== "someone" ? lang[data.kind] : lang.fallback;
  const url = safePath(data.url);

  event.waitUntil(
    self.registration.showNotification("Pistl", {
      body: template.replace("{name}", name),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: url,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safePath(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((focused) => (focused && "navigate" in focused ? focused.navigate(url) : focused));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
