import type { MessageKey } from "@/lib/i18n/translate";

/* The first line of Today answers "which of my friends are out today?"
   (usability protocol, task 3) with names, not a number. Only confirmed
   friends are named; anyone else on today's rides is only counted. */

interface Person {
  id: string;
  name: string;
}

export interface CrewOutLine {
  key: MessageKey;
  values: Record<string, string | number>;
  /* The friends named or counted in the line, for their faces. */
  friendIds: string[];
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function crewOutLine(facesToday: readonly Person[], friendIds: readonly string[], ridersToday: number): CrewOutLine | null {
  const friends = facesToday.filter((person) => friendIds.includes(person.id));
  const ids = friends.map((person) => person.id);
  const [a, b] = friends.map((person) => firstName(person.name));

  if (friends.length === 1) return { key: "feed.crewOutOne", values: { a: a! }, friendIds: ids };
  if (friends.length === 2) return { key: "feed.crewOutTwo", values: { a: a!, b: b! }, friendIds: ids };
  if (friends.length > 2) return { key: "feed.crewOutMore", values: { a: a!, b: b!, n: friends.length - 2 }, friendIds: ids };
  if (ridersToday > 0) return { key: "feed.outToday", values: { n: ridersToday }, friendIds: [] };
  return null;
}
