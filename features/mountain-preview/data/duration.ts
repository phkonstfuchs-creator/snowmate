import { formatMountainDuration } from "../../mountain-data/duration";

export function formatPilotDuration(value: string | undefined): string | null {
  return formatMountainDuration(value);
}
