export function renderHTML(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}
