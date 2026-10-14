// Final event handlers and startup.

/* --- events and startup --- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a == "lrole") {
    loginForm.role = b.dataset.r;
    loginForm.err = "";
    renderLogin();
  } else if (a == "lpw") {
    loginForm.show = !loginForm.show;
    renderLogin();
    const p = qs("#login input[name=pw]");
    if (p) p.focus();
  } else if (a == "lmode") {
    loginForm.mode = loginForm.mode == "in" ? "up" : "in";
    loginForm.err = "";
    renderLogin();
  } else if (a == "ldemo") {
    const d = Object.entries(DEMO_ACCOUNTS).find(([k, v]) => v.role == loginForm.role);
    loginForm.id = d[0];
    loginForm.pw = "demo123";
    loginForm.mode = "in";
    submitLogin();
  } else if (a == "logout") {
    localStorage.removeItem("hc_sess");
    location.reload();
  } else if (a == "share") shareRecords((qs("[data-sh]").value || "").trim());
  else if (a == "revoke") revokeShare(b.dataset.i);
  else if (a == "pv") {
    openPatientKey = b.dataset.i;
    renderApp();
  } else if (a == "pb") {
    openPatientKey = null;
    renderApp();
  } else if (a == "remove-local-patient") {
    if (!confirm("Remove this patient entry?")) return;
    state.patients = (state.patients || []).filter((x) => x.id != b.dataset.i);
    saveState();
    renderApp();
  } else if (a == "remove-local-staff") {
    if (!confirm("Remove this doctor from the directory?")) return;
    state.staff = (state.staff || []).filter((x) => x.id != b.dataset.i);
    saveState();
    renderApp();
  } else if (a == "pf") {
    const x = sharedWithMe().find((y) => patientKey(y) == b.dataset.i);
    if (!x) return;
    const l = document.createElement("a");
    l.href = URL.createObjectURL(
      new Blob([JSON.stringify(x.fhir, null, 2)], { type: "application/fhir+json" }),
    );
    l.download = "fhir-bundle-" + x.from + ".json";
    l.click();
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.dataset.f == "login") submitLogin();
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (f.dataset.f != "localPatient" && f.dataset.f != "localStaff") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (f.dataset.f == "localPatient") {
    d.ref = d.ref.trim();
    if (d.ref && state.patients.some((x) => sameText(x.ref, d.ref)))
      return showToast("That patient ID or reference is already in this list.");
    state.patients.push({ id: newId(), ...d, at: nowStamp() });
  } else {
    d.doctorId = d.doctorId.trim();
    if (
      (state.staff || []).some((x) => sameText(x.doctorId, d.doctorId)) ||
      linkedDoctors().some((x) => sameText(x.id, d.doctorId))
    )
      return showToast("That doctor ID is already linked or listed.");
    state.staff = state.staff || [];
    state.staff.push({ id: newId(), ...d });
  }
  saveState();
  renderApp();
  showToast(f.dataset.f == "localPatient" ? "Patient added" : "Doctor added to directory");
});
document.addEventListener("input", (e) => {
  const d = e.target.dataset;
  if (d.lg) loginForm[d.lg] = e.target.value;
});
document.addEventListener("change", (e) => {
  const x = e.target;
  if (x.id == "lang" || "ll" in x.dataset) {
    localStorage.setItem("hc_lang", x.value);
    if ("ll" in x.dataset) {
      state.lang = x.value;
      renderLogin();
    }
  } else if (x.id == "theme" || x.id == "size") {
    state[x.id] = x.value;
    applyDisplaySettings();
    saveState();
  }
});
document.addEventListener("click", (e) => {
  const d = qs(".display-controls");
  if (d && d.open && !d.contains(e.target)) d.open = false;
});
document.addEventListener("keydown", (e) => {
  const d = qs(".display-controls");
  if (e.key == "Escape" && d && d.open) {
    d.open = false;
    d.querySelector("summary").focus();
  }
});
function startApp() {
  applyDisplaySettings();
  if (!currentUser()) {
    const h = localStorage.getItem("hc_lang");
    if (h) state.lang = h;
    return renderLogin();
  }
  const h = localStorage.getItem("hc_lang");
  if (h) state.lang = h;
  if (currentUser().role == "person" && !state.emg.name) state.emg.name = currentUser().name;
  TAB_ORDER.splice(0, TAB_ORDER.length, ...TABS_BY_ROLE[currentUser().role]);
  if (!TAB_ORDER.includes(state.tab)) state.tab = TAB_ORDER[0];
  document.documentElement.dataset.role = currentUser().role;
  qs("header").insertAdjacentHTML(
    "beforeend",
    `<span class="m" id="who"><span class="avatar" aria-hidden="true">${escapeHtml((currentUser().name || "?").trim().charAt(0).toUpperCase())}</span>${escapeHtml(currentUser().name)} <span class="tag">${loginT(currentUser().role)}</span></span><button class="g" data-a="logout">${loginT("out")}</button>`,
  );
  renderApp();
  reminderTick();
  setInterval(reminderTick, 20000);
}
startApp();
