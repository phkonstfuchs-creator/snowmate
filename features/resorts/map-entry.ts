/** Only this explicit Today action may open the lift picker. */
export function readMapAction(value: string | string[] | undefined): "lift" | null {
  return value === "lift" ? "lift" : null;
}

/** Return a local URL: never route to an origin supplied in the query. */
export function consumeMapAction(href: string): string | null {
  const url = new URL(href);
  if (url.searchParams.getAll("action").length !== 1 || url.searchParams.get("action") !== "lift") return null;
  url.searchParams.delete("action");
  return `${url.pathname}${url.search}${url.hash}`;
}
