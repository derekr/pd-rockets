/** Release tags use UTC calendar dates; -2, -3, ... distinguish later releases on the same day. */
export function isReleaseTag(tag: string): boolean {
  const match = /^v(\d{4})-(\d{2})-(\d{2})(?:-([2-9]\d*))?$/.exec(tag);
  if (!match) return false;
  const [, year, month, day, sequence] = match;
  if (sequence && !Number.isSafeInteger(Number(sequence))) return false;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === `${year}-${month}-${day}`;
}

export function nextReleaseTag(date: Date, existing: Iterable<string>): string {
  const base = `v${date.toISOString().slice(0, 10)}`;
  let highest = 0;
  for (const tag of existing) {
    if (tag === base) highest = Math.max(highest, 1);
    else if (tag.startsWith(`${base}-`) && isReleaseTag(tag)) {
      highest = Math.max(highest, Number(tag.slice(base.length + 1)));
    }
  }
  return highest ? `${base}-${highest + 1}` : base;
}
