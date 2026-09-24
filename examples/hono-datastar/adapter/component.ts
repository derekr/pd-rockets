// Minimal server-side component metadata for the standalone adapter.
// Application action bindings and transport policy belong to the host.

export type ComponentEvent<Detail> = Readonly<{
  name: string;
  __detail?: (detail: Detail) => Detail;
}>;

export type ComponentDefinition<Events extends Record<string, ComponentEvent<any>>> = Readonly<{
  id: string;
  tag: string;
  events: Events;
}>;

export function event<Detail>(name: string, _options?: { description?: string }): ComponentEvent<Detail> {
  return Object.freeze({ name });
}

export function defineComponent<const Events extends Record<string, ComponentEvent<any>>>(definition: {
  id: string;
  tag: string;
  client?: { load: "eager" | "lazy" };
  events?: Events;
}): ComponentDefinition<Events> {
  return Object.freeze({ id: definition.id, tag: definition.tag, events: definition.events ?? ({} as Events) });
}

export function componentAttrs(_component?: unknown, _values?: unknown): Record<string, never> {
  return {};
}
