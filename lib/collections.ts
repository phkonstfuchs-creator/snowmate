export function toggleSetValue<T>(
  values: ReadonlySet<T>,
  value: T,
): Set<T> {
  const nextValues = new Set(values);

  if (nextValues.has(value)) {
    nextValues.delete(value);
  } else {
    nextValues.add(value);
  }

  return nextValues;
}
