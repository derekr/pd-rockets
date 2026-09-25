// Keep anchored shortcut popovers in view when the browser cannot flip an anchor position.
for (const popover of document.querySelectorAll<HTMLElement>(".keyboard-help-popover")) {
  const trigger = document.querySelector<HTMLElement>(`[popovertarget="${popover.id}"]`);
  if (!trigger) continue;
  popover.addEventListener("toggle", (event) => {
    if (event.newState !== "open") {
      popover.style.removeProperty("top");
      popover.style.removeProperty("right");
      return;
    }
    requestAnimationFrame(() => {
      if (!popover.matches(":popover-open")) return;
      const rect = popover.getBoundingClientRect();
      if (rect.left < 12) {
        popover.style.right = `${Math.max(12, window.innerWidth - rect.right - (12 - rect.left))}px`;
      }
      if (rect.bottom > window.innerHeight - 12 || rect.top < 12) {
        const above = trigger.getBoundingClientRect().top - rect.height - 8;
        popover.style.top = `${Math.max(12, above)}px`;
      }
    });
  });
}
