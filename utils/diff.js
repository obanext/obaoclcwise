export function diffObjects(ref = {}, mapped = {}) {
  const keys = new Set([...Object.keys(ref), ...Object.keys(mapped)]);
  return [...keys].map((k) => ({
    field: k,
    reference: ref[k],
    mapped: mapped[k],
    status:
      ref[k] === undefined
        ? "missing_reference"
        : mapped[k] === undefined
        ? "missing_new"
        : JSON.stringify(ref[k]) === JSON.stringify(mapped[k])
        ? "match"
        : "mismatch",
  }));
}
