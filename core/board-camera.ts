export type BoardCameraOptions = {
  host: HTMLElement;
  lanes(): HTMLElement[];
  engaged(): boolean;
  settle(x: number, y: number): void;
  edge?: number;
  speed?: number;
  settleMs?: number;
};

/** Optional edge scroll while dragging; follows the page's scrollable ancestors and lanes. */
export function installBoardCamera(options: BoardCameraOptions): () => void {
  const { host } = options;
  const edge = options.edge ?? 60;
  const speed = options.speed ?? 15;
  const settleMs = options.settleMs ?? 150;
  let dragging = false;
  let x = 0;
  let y = 0;
  let frame: number | null = null;
  let timeout: number | null = null;
  let scrolling = false;
  let container: Element | null = null;

  function scrollContainer(): Element {
    let node = host.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if ([style.overflowY, style.overflowX].some((value) => value === "auto" || value === "scroll")) return node;
      node = node.parentElement;
    }
    return document.scrollingElement ?? document.documentElement;
  }
  const isDocument = (element: Element) =>
    element === document.scrollingElement || element === document.documentElement;
  function setScrolling(active: boolean) {
    if (active) {
      scrolling = true;
      if (timeout !== null) window.clearTimeout(timeout);
      timeout = null;
    } else if (timeout === null) {
      timeout = window.setTimeout(() => {
        scrolling = false;
        timeout = null;
        if (options.engaged()) options.settle(x, y);
      }, settleMs);
    }
  }
  function loop() {
    if (!dragging) {
      frame = null;
      if (scrolling) setScrolling(false);
      return;
    }
    const horizontal = container ?? scrollContainer();
    const vp = isDocument(horizontal)
      ? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      : (() => {
          const rect = horizontal.getBoundingClientRect();
          return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        })();
    let vertical = horizontal;
    let top = vp.top;
    let height = vp.height;
    const boardRect = host.getBoundingClientRect();
    if (y >= boardRect.top && y <= boardRect.bottom) {
      const lane = options.lanes().find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return x >= rect.left && x <= rect.right;
      });
      if (lane) {
        const style = getComputedStyle(lane);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          vertical = lane;
          const rect = lane.getBoundingClientRect();
          top = rect.top;
          height = rect.height;
        }
      }
    }
    const rx = x - vp.left;
    const ry = y - top;
    let vx = 0;
    let vy = 0;
    if (rx < edge) vx = -speed * (1 - rx / edge);
    else if (rx > vp.width - edge) vx = speed * (1 - (vp.width - rx) / edge);
    if (ry < edge) vy = -speed * (1 - ry / edge);
    else if (ry > height - edge) vy = speed * (1 - (height - ry) / edge);
    if (vx || vy) {
      if (!scrolling) setScrolling(true);
      if (vx) {
        if (isDocument(horizontal)) window.scrollBy(vx, 0);
        else horizontal.scrollLeft += vx;
      }
      if (vy) {
        if (isDocument(vertical)) window.scrollBy(0, vy);
        else vertical.scrollTop += vy;
      }
    } else if (scrolling) setScrolling(false);
    frame = requestAnimationFrame(loop);
  }
  const onDown = () => {
    dragging = true;
    container = scrollContainer();
    if (frame === null) frame = requestAnimationFrame(loop);
  };
  const onMove = (event: PointerEvent) => {
    if (!options.engaged()) return;
    x = event.clientX;
    y = event.clientY;
    if (dragging && frame === null) frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    dragging = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (scrolling) setScrolling(false);
  };
  host.addEventListener("pointerdown", onDown, true);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", stop);
  host.addEventListener("pointercancel", stop);
  return () => {
    host.removeEventListener("pointerdown", onDown, true);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerup", stop);
    host.removeEventListener("pointercancel", stop);
    dragging = false;
    if (frame !== null) cancelAnimationFrame(frame);
    if (timeout !== null) window.clearTimeout(timeout);
  };
}
