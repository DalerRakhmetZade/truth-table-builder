// About dialog wiring: version label, changelog, and open/close behavior.
import { APP_VERSION, CHANGELOG, renderChangelog } from "./version.js";

export function initAbout() {
  const versionLabel = document.getElementById("versionLabel");
  const aboutVersion = document.getElementById("aboutVersion");
  if (versionLabel) versionLabel.textContent = "v" + APP_VERSION;
  if (aboutVersion) aboutVersion.textContent = "v" + APP_VERSION;

  const changelogEl = document.getElementById("changelog");
  if (changelogEl) changelogEl.innerHTML = renderChangelog(CHANGELOG);

  const dialog = document.getElementById("aboutDialog");
  const openBtn = document.getElementById("aboutBtn");
  const closeBtn = document.getElementById("aboutClose");
  if (!dialog || !openBtn) return;

  openBtn.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
  // close when clicking the backdrop (outside the dialog content box)
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
}
