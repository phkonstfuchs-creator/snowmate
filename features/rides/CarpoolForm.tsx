"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCarpoolAction } from "./actions";
import { createCarpoolInputSchema } from "./schema";
import type { City } from "@/lib/types";
import type { RideResortOption } from "./RideCatalog";
export default function CarpoolForm({
  city,
  resorts,
}: {
  city: City;
  resorts: RideResortOption[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<"driver" | "rider">("driver");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const retry = useRef<{
    payload: string;
    key: string;
  } | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    const date = new Date(String(fields.get("departureAt")));
    const payload = {
      city,
      role,
      resortId: String(fields.get("resortId")),
      departureAt: Number.isFinite(date.getTime()) ? date.toISOString() : "",
      totalSeats: role === "rider" ? 1 : Number(fields.get("totalSeats")),
      audience: String(fields.get("audience")),
      note: String(fields.get("note")),
      departurePoint: String(fields.get("departurePoint")),
    };
    const fingerprint = JSON.stringify(payload);
    const key =
      retry.current?.payload === fingerprint
        ? retry.current.key
        : crypto.randomUUID();
    const validation = createCarpoolInputSchema().safeParse({
      ...payload,
      idempotencyKey: key,
    });
    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Bitte prüfe deine Angaben.",
      );
      return;
    }
    retry.current = { payload: fingerprint, key };
    startTransition(async () => {
      try {
        const result = await createCarpoolAction(validation.data);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        retry.current = null;
        router.push(`/carpool/${result.id}`);
        router.refresh();
      } catch {
        setError(
          "Das Inserat konnte nicht gespeichert werden. Versuche es erneut.",
        );
      }
    });
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <fieldset disabled={pending} className="space-y-4">
        <legend className="font-black">Deine Mitfahrt</legend>

        <label className="block text-sm font-bold">
          Rolle
          <select
            className="form-input mt-1"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "driver" | "rider")
            }
          >
            <option value="driver">Ich fahre</option>
            <option value="rider">Ich suche einen Platz</option>
          </select>
        </label>

        <label className="block text-sm font-bold">
          Zielgebiet
          <select
            name="resortId"
            className="form-input mt-1"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Skigebiet wählen
            </option>
            {resorts.map((resort) => (
              <option key={resort.id} value={resort.id}>
                {resort.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-bold">
          Abfahrt: Datum und Uhrzeit
          <input
            name="departureAt"
            type="datetime-local"
            required
            className="form-input mt-1"
          />
        </label>

        <label className="block text-sm font-bold">
          Genauer Abfahrtsort
          <input
            name="departurePoint"
            required
            minLength={2}
            maxLength={200}
            className="form-input mt-1"
            placeholder="z. B. Innsbruck Hbf, Haupteingang"
          />
        </label>

        <p className="text-xs">
          Der genaue Ort ist für dich, bestätigte Freunde und angenommene
          Mitfahrer sichtbar.
        </p>

        {role === "driver" && (
          <label className="block text-sm font-bold">
            Freie Plätze für Mitfahrer
            <input
              name="totalSeats"
              type="number"
              min={1}
              max={8}
              required
              defaultValue={3}
              className="form-input mt-1"
            />
          </label>
        )}

        <label className="block text-sm font-bold">
          Sichtbarkeit
          <select
            name="audience"
            defaultValue="friends"
            className="form-input mt-1"
          >
            <option value="friends">Meine Freunde</option>
            <option value="friends-of-friends">
              Freunde und deren Freunde
            </option>
          </select>
        </label>

        <label className="block text-sm font-bold">
          Notiz
          <textarea
            name="note"
            maxLength={300}
            className="form-input mt-1"
            placeholder="Gepäck, Rückfahrt oder Kostenbeteiligung"
          />
        </label>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="text-sm font-bold"
          style={{ color: "var(--rust)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || resorts.length === 0}
        className="w-full py-4 font-black disabled:opacity-50"
        style={{
          background: "var(--accent-primary)",
          color: "var(--text-on-accent)",
        }}
      >
        {pending ? "Wird gespeichert …" : "Inserat veröffentlichen"}
      </button>
    </form>
  );
}
