"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRideAction } from "./actions";
import { createRideInputSchema } from "./schema";
import type { RideResortOption } from "./RideCatalog";
export default function RideCreateForm({
  resorts,
}: {
  resorts: RideResortOption[];
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const date = new Date(String(form.get("startsAt")));
    key.current ??= crypto.randomUUID();
    const input = {
      resortId: form.get("resortId"),
      abilityLevel: form.get("abilityLevel"),
      startsAt: Number.isFinite(date.getTime()) ? date.toISOString() : "",
      capacity: Number(form.get("capacity")),
      audience: form.get("audience"),
      caption: form.get("caption"),
      meetingPoint: form.get("meetingPoint"),
      idempotencyKey: key.current,
    };
    const parsed = createRideInputSchema().safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await createRideAction(parsed.data);
      if (result.ok) {
        router.push(`/feed/${result.id}`);
        router.refresh();
      } else setError(result.message);
    } catch {
      setError(
        "Die Ausfahrt konnte nicht gespeichert werden. Versuche es erneut.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const fieldClass =
    "block w-full p-3 mt-1 border border-current bg-transparent";
  return (
    <form
      onSubmit={submit}
      onChange={() => {
        if (!busy.current) key.current = null;
      }}
      className="space-y-4"
    >
      <fieldset disabled={pending} className="space-y-4">
        <label className="block">
          Skigebiet
          <select name="resortId" className={fieldClass} required>
            {resorts.map((resort) => (
              <option key={resort.id} value={resort.id}>
                {resort.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Datum und Uhrzeit (deine lokale Zeit)
          <input
            name="startsAt"
            type="datetime-local"
            required
            className={fieldClass}
          />
        </label>
        <label className="block">
          Fahrstil
          <select name="abilityLevel" className={fieldClass}>
            <option value="chill">Chill</option>
            <option value="park">Park</option>
            <option value="off-piste">Off-Piste</option>
          </select>
        </label>
        <label className="block">
          Plätze insgesamt, inklusive dir
          <input
            name="capacity"
            type="number"
            min={2}
            max={12}
            defaultValue={4}
            required
            className={fieldClass}
          />
        </label>
        <label className="block">
          Sichtbarkeit
          <select name="audience" className={fieldClass}>
            <option value="friends">Freunde</option>
            <option value="friends-of-friends">
              Freunde und deren Freunde
            </option>
          </select>
        </label>
        <p className="text-sm">
          Für Minderjährige gilt automatisch die engere Freundesgruppe.
        </p>
        <label className="block">
          Genauer Treffpunkt
          <input
            name="meetingPoint"
            minLength={2}
            maxLength={200}
            required
            className={fieldClass}
          />
        </label>
        <p className="text-sm">
          Der genaue Treffpunkt ist für bestätigte Freunde und angenommene
          Teilnehmer sichtbar.
        </p>
        <label className="block">
          Notiz
          <textarea name="caption" maxLength={500} className={fieldClass} />
        </label>
        <button
          disabled={resorts.length === 0}
          className="px-4 py-3 font-bold"
          style={{ background: "var(--rust)", color: "var(--paper-0)" }}
        >
          {pending ? "Wird gespeichert …" : "Ausfahrt veröffentlichen"}
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
