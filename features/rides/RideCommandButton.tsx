"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommandResult } from "./actions";
export default function RideCommandButton({
  action,
  input,
  label,
  success,
  disabled = false,
}: {
  action: (input: unknown) => Promise<CommandResult>;
  input: Record<string, unknown>;
  label: string;
  success: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  async function run() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    key.current ??= crypto.randomUUID();
    try {
      const result = await action({ ...input, idempotencyKey: key.current });
      setSaved(result.ok);
      setMessage(result.ok ? success : result.message);
      if (result.ok) router.refresh();
    } catch {
      setSaved(false);
      setMessage(
        "Die Änderung konnte nicht gespeichert werden. Versuche es erneut.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending || saved}
        onClick={run}
        className="card-tap px-4 py-3 font-bold disabled:opacity-50"
        style={{
          background: "var(--rust)",
          color: "var(--paper-0)",
          border: "var(--rule-thin)",
        }}
      >
        {pending ? "Wird gespeichert …" : label}
      </button>
      {message && (
        <p role={saved ? "status" : "alert"} className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
