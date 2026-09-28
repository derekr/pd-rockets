export type BoardDragFrames = {
  durationMs: number;
  frames: number;
  slowFrames: number;
  maxFrameMs: number;
};

export type BoardLaneTabsOptions = {
  host: HTMLElement;
  tabSelector: string;
  scrollerSelector: string;
  lanes(): HTMLElement[];
  tabColumn(tab: HTMLElement): number;
  laneColumn(lane: HTMLElement): number;
  mobileQuery: string;
  draggingAttribute: string;
  originAttribute: string;
  targetAttribute: string;
  onDropTarget?(column: number | null, previous: number | null): void;
  onDragFrames?(frames: BoardDragFrames): void;
};

/** Page-authored lane tabs: pager sync and drag hit testing, without owning markup or move policy. */
export function installBoardLaneTabs(options: BoardLaneTabsOptions) {
  const { host } = options;
  const tabs = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>(options.tabSelector)];
  const scroller = () => host.querySelector<HTMLElement>(options.scrollerSelector);
  const laneFor = (column: number) => options.lanes().find((lane) => options.laneColumn(lane) === column);
  let active: number | null = null;
  let scrollFrame = 0;
  let targetFrame = 0;
  let pointer: { x: number; y: number } | null = null;
  let targetColumn: number | null = null;
  let originColumn: number | null = null;
  let sample: { started: number; last: number; frames: number; slow: number; max: number; frame: number } | null = null;

  function select(column: number): void {
    active = column;
    for (const tab of tabs()) tab.setAttribute("aria-selected", String(options.tabColumn(tab) === column));
  }

  function show(column: number): void {
    select(column);
    const lane = laneFor(column);
    const scroll = scroller();
    if (lane && scroll)
      scroll.scrollTo({
        left: lane.offsetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }

  function updateDropTarget(): void {
    if (!pointer || !sample) return;
    let target: HTMLElement | null = null;
    for (const tab of tabs()) {
      const rect = tab.getBoundingClientRect();
      if (pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom)
        target = tab;
    }
    const column = target ? options.tabColumn(target) : null;
    if (column == null || !Number.isInteger(column)) target = null;
    const previous = targetColumn;
    targetColumn = column != null && Number.isInteger(column) ? column : null;
    for (const tab of tabs()) tab.toggleAttribute(options.targetAttribute, tab === target);
    options.onDropTarget?.(targetColumn, previous);
  }

  function reassert(): void {
    const list = tabs();
    if (!list.length) return;
    const columns = list.map(options.tabColumn).filter(Number.isInteger);
    if (active == null || !columns.includes(active)) active = columns[0] ?? null;
    for (const tab of list) tab.setAttribute("aria-selected", String(options.tabColumn(tab) === active));
    if (sample) {
      host.setAttribute(options.draggingAttribute, "");
      for (const tab of list) tab.toggleAttribute(options.originAttribute, options.tabColumn(tab) === originColumn);
      updateDropTarget();
    }
    if (!matchMedia(options.mobileQuery).matches || active == null) return;
    const scroll = scroller();
    const lane = laneFor(active);
    if (scroll && lane && Math.abs(scroll.scrollLeft - lane.offsetLeft) > 2) scroll.scrollLeft = lane.offsetLeft;
  }

  function startCardDrag(column: number): void {
    originColumn = column;
    host.setAttribute(options.draggingAttribute, "");
    for (const tab of tabs()) tab.toggleAttribute(options.originAttribute, options.tabColumn(tab) === column);
    const now = performance.now();
    const current = { started: now, last: now, frames: 0, slow: 0, max: 0, frame: 0 };
    const tick = (time: number): void => {
      if (sample !== current) return;
      const elapsed = time - current.last;
      current.last = time;
      current.frames++;
      if (elapsed > 24) current.slow++;
      current.max = Math.max(current.max, elapsed);
      current.frame = requestAnimationFrame(tick);
    };
    sample = current;
    current.frame = requestAnimationFrame(tick);
  }

  function finishCardDrag(): void {
    if (targetFrame) cancelAnimationFrame(targetFrame);
    targetFrame = 0;
    pointer = null;
    targetColumn = null;
    originColumn = null;
    host.removeAttribute(options.draggingAttribute);
    for (const tab of tabs()) {
      tab.removeAttribute(options.originAttribute);
      tab.removeAttribute(options.targetAttribute);
    }
    const current = sample;
    if (!current) return;
    sample = null;
    cancelAnimationFrame(current.frame);
    options.onDragFrames?.({
      durationMs: Math.round(performance.now() - current.started),
      frames: current.frames,
      slowFrames: current.slow,
      maxFrameMs: Math.round(current.max),
    });
  }

  function trackPointer(event: PointerEvent): void {
    if (!sample) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!targetFrame)
      targetFrame = requestAnimationFrame(() => {
        targetFrame = 0;
        updateDropTarget();
      });
  }

  const onClick = (event: MouseEvent) => {
    const tab = (event.target as Element | null)?.closest<HTMLElement>(options.tabSelector);
    if (!tab || !host.contains(tab) || !scroller()) return;
    const column = options.tabColumn(tab);
    if (Number.isInteger(column) && laneFor(column)) show(column);
  };
  const onScroll = (event: Event) => {
    const scroll = scroller();
    if (!scroll || event.target !== scroll || !matchMedia(options.mobileQuery).matches) return;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const nearest = options
        .lanes()
        .reduce<HTMLElement | null>(
          (best, lane) =>
            !best || Math.abs(lane.offsetLeft - scroll.scrollLeft) < Math.abs(best.offsetLeft - scroll.scrollLeft)
              ? lane
              : best,
          null,
        );
      const column = nearest && options.laneColumn(nearest);
      if (column != null && Number.isInteger(column)) select(column);
    });
  };

  host.addEventListener("click", onClick);
  host.addEventListener("scroll", onScroll, true);
  reassert();
  return {
    startCardDrag,
    finishCardDrag,
    trackPointer,
    updateDropTarget,
    targetColumn: (): number | null => targetColumn,
    show,
    reassert,
    dispose() {
      host.removeEventListener("click", onClick);
      host.removeEventListener("scroll", onScroll, true);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (targetFrame) cancelAnimationFrame(targetFrame);
      if (sample) cancelAnimationFrame(sample.frame);
      sample = null;
      host.removeAttribute(options.draggingAttribute);
      for (const tab of tabs()) {
        tab.removeAttribute(options.originAttribute);
        tab.removeAttribute(options.targetAttribute);
      }
    },
  };
}
