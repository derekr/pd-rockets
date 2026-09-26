// Page-owned synthetic edit state; the reusable editor emits intents only.
const demo = document.querySelector<HTMLElement>("#inline-edit-demo");
if (demo) {
  const editor = demo.querySelector<HTMLElement>("rocket-inline-edit");
  const input = demo.querySelector<HTMLInputElement>("[data-inline-edit-input]");
  const title = demo.querySelector<HTMLElement>("[data-inline-edit-value]");
  editor?.addEventListener("rocket-inline-edit-request", () => {
    if (!input || !title) return;
    input.value = title.textContent ?? "";
    demo.classList.add("editing");
    // The second pointer press still has a browser focus default to run.
    requestAnimationFrame(() => {
      if (!demo.classList.contains("editing")) return;
      input.focus();
      input.select();
    });
  });
  editor?.addEventListener("rocket-inline-edit-cancel", () => demo.classList.remove("editing"));
  editor?.addEventListener("rocket-inline-edit-commit", (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value.trim().slice(0, 80);
    if (value && title) title.textContent = value;
    demo.classList.remove("editing");
  });
}
