import ProfileAccessActions from "./ProfileAccessActions";

export default function ProfileUnavailable() {
  return (
    <main className="min-h-dvh" style={{ background: "var(--ink-0)" }}>
      <div
        className="paper-grain mx-auto flex min-h-dvh w-full max-w-[430px] items-center px-5 py-10"
        style={{ background: "var(--paper-0)" }}
      >
        <div>
          <p className="text-mono-label" style={{ color: "var(--rust)" }}>
            Verbindung unterbrochen
          </p>
          <h1 className="text-display-md mt-3" style={{ color: "var(--ink-0)" }}>
            Profil gerade nicht erreichbar
          </h1>
          <p
            className="mt-3 text-base leading-relaxed"
            style={{ color: "var(--ink-1)" }}
          >
            Snowmate konnte deinen Profilstatus nicht sicher prüfen. Lade die
            Seite in einem Moment erneut.
          </p>
          <ProfileAccessActions />
        </div>
      </div>
    </main>
  );
}
