// In-app confirm dialog + toast, styled to match the app (replaces the native
// window.confirm / window.alert popups).

let confirmDlg = null;
let toastEl = null;

function ensureConfirmDialog() {
  if (confirmDlg) return confirmDlg;
  const dlg = document.createElement("dialog");
  dlg.className = "app-dialog confirm-dialog";
  dlg.innerHTML =
    '<div class="confirm-box">' +
      '<p class="confirm-msg"></p>' +
      '<div class="confirm-actions">' +
        '<button type="button" class="confirm-cancel">Cancel</button>' +
        '<button type="button" class="confirm-ok primary">Confirm</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dlg);
  confirmDlg = dlg;
  return dlg;
}

// Promise-based confirmation. Resolves true (confirmed) or false (cancelled).
export function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    const dlg = ensureConfirmDialog();
    dlg.querySelector(".confirm-msg").textContent = message;
    const ok = dlg.querySelector(".confirm-ok");
    const cancel = dlg.querySelector(".confirm-cancel");
    ok.textContent = opts.confirmText || "Confirm";
    ok.classList.toggle("danger", !!opts.danger);

    function done(result) {
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      dlg.removeEventListener("cancel", onEsc);
      dlg.removeEventListener("click", onBackdrop);
      if (dlg.open) dlg.close();
      resolve(result);
    }
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onEsc = (e) => { e.preventDefault(); done(false); };
    const onBackdrop = (e) => { if (e.target === dlg) done(false); };

    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    dlg.addEventListener("cancel", onEsc);
    dlg.addEventListener("click", onBackdrop);

    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    ok.focus();
  });
}

// Brief, non-blocking toast message (replaces alert for hints).
export function notify(message, ms = 2400) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(notify._t);
  notify._t = setTimeout(() => toastEl.classList.remove("show"), ms);
}
