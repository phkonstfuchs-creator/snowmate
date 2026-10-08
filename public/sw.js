/* Pistl service worker: shows push notices (ADR 0025). A notice carries
   only its kind, a name and the page to open; the sentence is made here,
   in the device's language. Without signal, a page load shows a small
   offline page instead of the browser's error (ADR 0035). Nothing is
   cached: signed-in pages hold private data and stay no-store. */

const TEXT = {
  de: {
    message: "{name} hat dir geschrieben",
    friend_request: "{name} möchte mit dir befreundet sein",
    friend_accepted: "{name} ist jetzt in deiner Crew",
    ride_request: "{name} möchte bei deinem Ride mitfahren",
    ride_joined: "{name} fährt bei deinem Ride mit",
    ride_accepted: "{name} hat dich in den Ride gelassen",
    lift_meetup: "{name} fährt gerade Lift. Treffpunkt auf der Karte ansehen",
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
    lift_meetup: "{name} is taking a lift. See the meetup on the map",
    fallback: "Something new in your crew",
    someone: "Someone",
  },
};

function safePath(value) {
  return typeof value === "string" && /^\/(?!\/)[A-Za-z0-9/_-]{0,120}$/.test(value) ? value : "/feed";
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

const OFFLINE = {
  de: { title: "Kein Netz", text: "Pistl braucht kurz Empfang. Sobald du wieder Netz hast, tipp auf Nochmal.", retry: "Nochmal", tabs: ["Heute", "Karte", "Crew", "Profil"] },
  en: { title: "No signal", text: "Pistl needs a connection for a moment. Once you have signal again, tap Try again.", retry: "Try again", tabs: ["Today", "Map", "Crew", "Profile"] },
};
const TABS = ["/feed", "/map", "/crew", "/profile"];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function offlinePage(url, lang) {
  const t = lang === "de" ? OFFLINE.de : OFFLINE.en;
  const tabs = TABS.map((href, i) => `<a href="${href}">${t.tabs[i]}</a>`).join("");
  return `<!doctype html><html lang="${lang === "de" ? "de" : "en"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Pistl · ${t.title}</title>
<style>body{margin:0;min-height:100dvh;display:flex;flex-direction:column;background:#f2f4f1;color:#1b2a22;font:16px -apple-system,system-ui,sans-serif}
main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:24px;text-align:center}
h1{margin:0;font-size:28px}p{margin:0;color:#4d5a52}
.retry{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;border-radius:14px;background:#2b6448;color:#fff;font-weight:600;text-decoration:none}
nav{display:flex;justify-content:space-around;padding:8px 8px calc(8px + env(safe-area-inset-bottom))}
nav a{display:flex;align-items:center;justify-content:center;min-height:48px;min-width:48px;color:#1b2a22;font-weight:600;text-decoration:none}</style>
</head><body><main><h1>${t.title}</h1><p>${t.text}</p><a class="retry" href="${escapeHtml(url)}">${t.retry}</a></main><nav>${tabs}</nav></body></html>`;
}

self.addEventListener("install", () => {
  if (self.skipWaiting) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (self.clients && self.clients.claim) event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  const lang = (self.navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  event.respondWith(
    fetch(request).catch(
      () => new Response(offlinePage(request.url, lang), {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      }),
    ),
  );
});
