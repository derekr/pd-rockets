/**
 * Small adapter seam for a JSX server renderer. The Rocket components only
 * receive event attributes; each page chooses its own Datastar action.
 */
export type DatastarEventBinding = Readonly<{
  event: string;
  attrs: Readonly<Record<string, string>>;
}>;

export function datastarEventBinding(event: string, binding?: DatastarEventBinding): Record<string, string> {
  if (!binding) return {};
  if (binding.event !== event) throw new Error(`datastar event binding: expected ${event}, received ${binding.event}`);
  return { ...binding.attrs };
}
