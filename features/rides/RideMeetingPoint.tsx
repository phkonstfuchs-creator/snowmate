export default function RideMeetingPoint({
  canViewExact,
  meetingPoint,
}: {
  canViewExact: boolean;
  meetingPoint: string | null;
}) {
  return (
    <p className="text-sm">
      {canViewExact && meetingPoint
        ? meetingPoint
        : "Nach Bestätigung wird dir der genaue Treffpunkt angezeigt."}
    </p>
  );
}
