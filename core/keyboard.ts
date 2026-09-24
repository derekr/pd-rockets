type KeyEvent = Pick<KeyboardEvent, "key" | "code" | "altKey" | "shiftKey" | "metaKey" | "ctrlKey">;

/** Match configurable shortcuts, including Option-letter characters on macOS. */
export function keyMatches(value: string, event: KeyEvent): boolean {
  const parts = value.split("+");
  const base = parts.pop() ?? "";
  const alt = parts.some((part) => part.toLowerCase() === "alt");
  const shift = parts.some((part) => part.toLowerCase() === "shift");
  const command = parts.some((part) => ["cmd", "ctrl", "meta"].includes(part.toLowerCase()));
  const hasCommand = event.metaKey || event.ctrlKey;
  const letterCodeMatches = alt && /^[a-z]$/i.test(base) && event.code === `Key${base.toUpperCase()}`;
  return (
    (base === event.key || letterCodeMatches) &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    hasCommand === command
  );
}
