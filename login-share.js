// Sign-in flow, consent-based sharing, doctor and hospital views.

const TABS_BY_ROLE = {
  person: [...TAB_ORDER],
  doctor: ["dd", "pts", "ref", "ai"],
  hospital: ["hd", "pts", "stf"],
};
const ID_LABELS = {
    person: "Phone, email or ABHA number",
    doctor: "Doctor registration ID",
    hospital: "Facility ID",
  },
  ROLE_BLURBS = {
    person: "Welcome 👋 Your health story, kept safe and simple, all in one place.",
    doctor: "See what your patients choose to share, so every visit starts well prepared.",
    hospital: "Keep track of patients and doctors across your facility.",
  };
let loginForm = {
  role: "person",
  mode: "in",
  id: "",
  pw: "",
  name: "",
  hosp: "",
  spec: "",
  err: "",
};

/* --- password hash (demo-grade) and session --- */
async function hashPassword(id, p) {
  const s = id.toLowerCase() + "|" + p;
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    let h = 5381;
    for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return "f" + h;
  }
}
function startSession(a) {
  const { hash, ...s } = a;
  localStorage.setItem("hc_sess", JSON.stringify(s));
  location.reload();
}
// Demo sign-in: accounts live in this browser only, with no server behind them.
async function submitLogin() {
  const g = loginForm,
    id = g.id.trim();
  g.err = "";
  if (!id || g.pw.length < 6) {
    g.err = "Please enter your ID and a password with at least 6 characters.";
    return renderLogin();
  }
  if (g.mode == "up") {
    if (!g.name.trim()) {
      g.err = "Please tell us your name.";
      return renderLogin();
    }
    if (allAccounts().some((a) => sameText(a.id, id))) {
      g.err = "That ID already has an account. Try signing in instead.";
      return renderLogin();
    }
    const a = {
      id,
      name: g.name.trim(),
      role: g.role,
      hash: await hashPassword(id, g.pw),
      key: "hc_u_" + id.toLowerCase().replace(/\W/g, "_"),
      hosp: g.role == "doctor" ? g.hosp.trim() : "",
      spec: g.role == "doctor" ? g.spec.trim() : "",
    };
    localStorage.setItem("hc_accts", JSON.stringify([...readJson("hc_accts", []), a]));
    return startSession(a);
  }
  const a = readJson("hc_accts", []).find((x) => sameText(x.id, id) && x.role == g.role);
  if (a && a.hash == (await hashPassword(id, g.pw))) return startSession(a);
  const dm = Object.entries(DEMO_ACCOUNTS).find(
    ([k, v]) => sameText(k, id) && v.role == g.role,
  );
  if (dm && g.pw == "demo123") return startSession({ id: dm[0], ...dm[1] });
  g.err = "We could not sign you in. Please check your ID, password and account type.";
  renderLogin();
}
function renderLogin() {
  let o = qs("#login");
  if (!o) {
    document.body.insertAdjacentHTML("beforeend", '<div id="login"></div>');
    o = qs("#login");
  }
  const g = loginForm,
    reg = g.mode == "up",
    f = (n, l, ty = "text", x = "") =>
      fieldHtml(n, l, ty, `data-lg="${n}" value="${escapeHtml(g[n])}" ${x}`);
  o.innerHTML = `<div class="lg"><div class="login-top"><select data-ll aria-label="Language" style="width:auto"><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option></select></div><div class="login-brand"><img class="login-logo" src="${LOGO.full}" alt="MediFile: your health records, always with you" width="220" height="220" /></div>
<div class="pps">${["person", "doctor", "hospital"].map((r) => `<button type="button" class="pp ${r == g.role ? "on" : ""}" data-a="lrole" data-r="${r}">${loginT(r)}</button>`).join("")}</div>
<div class="sec"><p class="m" style="margin-top:0">${ROLE_BLURBS[g.role]}</p><form data-f="login" style="grid-template-columns:1fr">${reg ? f("name", { person: "Full name", doctor: "Doctor name", hospital: "Hospital name" }[g.role], "text", "required") : ""}${f("id", ID_LABELS[g.role], "text", 'required autocomplete="username"')}<label>${loginT("pw")}<span class="pwbox"><input data-lg="pw" name="pw" type="${g.show ? "text" : "password"}" value="${escapeHtml(g.pw)}" required autocomplete="${reg ? "new" : "current"}-password"><button type="button" class="pwt" data-a="lpw" aria-label="${g.show ? "Hide" : "Show"} password">${g.show ? "Hide" : "Show"}</button></span></label>${reg && g.role == "doctor" ? f("spec", "Speciality") + f("hosp", "Hospital ID (optional)") : ""}
<p class="red" role="alert" style="margin:0">${escapeHtml(g.err)}</p><button class="b">${reg ? loginT("create") : loginT("signin")}</button></form>
<p style="margin:12px 0 0"><button type="button" class="g" data-a="lmode">${reg ? loginT("signin") : loginT("create")}</button> <button type="button" class="g" data-a="ldemo">Try the demo ${loginT(g.role).toLowerCase()}</button></p></div>
<p class="dis">This is a demo sign-in. Accounts and records stay in this browser and are not protected like a real login. Demo IDs: demo-patient, DR-1001, HOSP-2001 (password: demo123). Please do not enter real patient information.</p></div>`;
  o.querySelector("[data-ll]").value = state.lang;
}

/* --- consent-based sharing: person to doctor or hospital --- */
const readInbox = () => readJson("hc_inbox", {}),
  patientKey = (e) => e.from + "|" + e.to;
function shareRecords(id) {
  const tg = allAccounts().find((a) => sameText(a.id, id) && a.role != "person");
  if (!tg) return showToast("I could not find a doctor or hospital with that ID.");
  const d = readInbox(),
    e = state.emg;
  d[tg.id] = (d[tg.id] || []).filter((x) => x.from != currentUser().id);
  d[tg.id].push({
    from: currentUser().id,
    name: e.name || currentUser().name,
    abha: state.abha.no || "",
    age: e.age || "",
    cond: e.cond || "",
    allergies: e.allergies || "",
    at: new Date().toISOString(),
    labs: state.labs.filter((x) => LAB_TESTS[x.k]).map(({ k, v, d }) => ({ k, v, d })),
    meds: state.meds.map((m) => ({ name: m.name, dose: m.dose, times: m.times })),
    dx: state.dx.map((x) => x.t),
    fhir: buildFhirBundle(),
  });
  localStorage.setItem("hc_inbox", JSON.stringify(d));
  state.shares = [...new Set([...(state.shares || []), tg.id])];
  saveState();
  renderApp();
  showToast("Shared with " + tg.name);
}
function revokeShare(id) {
  const d = readInbox();
  d[id] = (d[id] || []).filter((x) => x.from != currentUser().id);
  localStorage.setItem("hc_inbox", JSON.stringify(d));
  state.shares = (state.shares || []).filter((x) => x != id);
  saveState();
  renderApp();
}
function shareBoxHtml() {
  const n = (id) => (allAccounts().find((a) => a.id == id) || {}).name || id;
  return `<div class="sec"><h3>Share with a doctor or hospital</h3><p class="m">You choose who sees your health information. Sharing sends them a copy right now. Share again to update it, or take back access whenever you like.</p><div class="chips" style="align-items:end"><label>Doctor or hospital ID<input data-sh placeholder="e.g. DR-1001"></label><button class="b" data-a="share">Share my records</button></div>${(state.shares || []).map((id) => `<div class="row"><div>${escapeHtml(n(id))} <span class="m">${escapeHtml(id)}</span></div><button class="x" data-a="revoke" data-i="${escapeHtml(id)}">Stop sharing</button></div>`).join("")}</div>`;
}
const baseAbhaView = views.abha;
views.abha = () => baseAbhaView() + shareBoxHtml();

/* --- doctor and hospital views --- */
let openPatientKey = null;
const linkedDoctors = () =>
  allAccounts().filter(
    (a) => a.role == "doctor" && a.hosp && sameText(a.hosp, currentUser().id),
  );
function sharedWithMe() {
  const d = readInbox(),
    ids = [
      currentUser().id,
      ...(currentUser().role == "hospital" ? linkedDoctors().map((x) => x.id) : []),
    ];
  return ids
    .flatMap((i) => (d[i] || []).map((x) => ({ ...x, to: i })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
const latestLabsOf = (e) => {
    const m = {};
    [...e.labs].sort((a, b) => (a.d < b.d ? -1 : 1)).forEach((x) => (m[x.k] = x));
    return Object.values(m);
  },
  flaggedLabs = (e) => latestLabsOf(e).filter((x) => labFlag(x.k, x.v) != "Normal");
const patientRow = (e) => {
  const a = flaggedLabs(e);
  return `<div class="row"><div><b>${escapeHtml(e.name)}</b> <span class="m">${e.age ? escapeHtml(e.age) + " · " : ""}${e.abha ? "ABHA " + escapeHtml(e.abha) + " · " : ""}shared ${formatDate(e.at.slice(0, 10))}${e.to != currentUser().id ? " · via " + escapeHtml(e.to) : ""}</span><div>${a.map((x) => `<span class="tag ${labFlag(x.k, x.v)}">${LAB_TESTS[x.k][0]} ${x.v}</span>`).join(" ") || '<span class="m">All shared results are in range</span>'}</div></div><button class="g" data-a="pv" data-i="${escapeHtml(patientKey(e))}">Open</button></div>`;
};
const localPatientRow = (p) =>
  `<div class="row"><div><b>${escapeHtml(p.name)}</b><div class="m">${p.ref ? "ID " + escapeHtml(p.ref) + " · " : ""}${p.age ? "Age " + escapeHtml(p.age) + " · " : ""}${escapeHtml(p.phone || "")}</div>${p.notes ? `<div>${escapeHtml(p.notes)}</div>` : ""}</div><button class="x" data-a="remove-local-patient" data-i="${escapeHtml(p.id)}">Remove</button></div>`;
const patientDetail = (
  e,
) => `<p><button class="g" data-a="pb">Back to all patients</button></p><div class="sec"><h3>${escapeHtml(e.name)}</h3><p class="m">${e.age ? "Age " + escapeHtml(e.age) + " · " : ""}${e.abha ? "ABHA " + escapeHtml(e.abha) + " · " : ""}shared ${formatDate(e.at.slice(0, 10))}</p><p>Conditions: ${escapeHtml([e.cond, ...e.dx].filter(Boolean).join(", ") || "–")}</p><p>Allergies: ${escapeHtml(e.allergies || "–")}</p></div>
<div class="sec"><h3>Latest results</h3>${
  latestLabsOf(e)
    .map((x) => {
      const f = labFlag(x.k, x.v);
      return `<div class="row"><div>${LAB_TESTS[x.k][0]}: <b>${x.v} ${LAB_TESTS[x.k][1]}</b> <span class="tag ${f}">${flagWord(f)}</span><div class="m">${formatDate(x.d)} · usual ${LAB_TESTS[x.k][2]}–${LAB_TESTS[x.k][3]}${f != "Normal" ? " · " + (LAB_TESTS[x.k][f == "Low" ? 4 : 5] || "") : ""}</div></div></div>`;
    })
    .join("") || emptyNote("No results shared yet.")
}</div>
<div class="sec"><h3>Medicines</h3>${e.meds.map((m) => `<div class="row"><div><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.dose)} <span class="m">${escapeHtml((m.times || []).join(", "))}</span></div></div>`).join("") || emptyNote("No medicines shared yet.")}</div><p><button class="g" data-a="pf" data-i="${escapeHtml(patientKey(e))}">Download FHIR bundle</button></p>`;
const statCard = (n, l) => `<div class="st"><b>${n}</b><span class="m">${l}</span></div>`;
Object.assign(views, {
  dd() {
    const i = sharedWithMe(),
      f = i.filter((e) => flaggedLabs(e).length);
    return `<h2>${tabText("dd")}</h2><p class="m">${escapeHtml(currentUser().name)}${currentUser().spec ? " · " + escapeHtml(currentUser().spec) : ""} · ID ${escapeHtml(currentUser().id)}</p><div class="stats">${statCard(i.length, "Patients who have shared with you")}${statCard(f.length, "Patients with results to review")}${statCard(
      f.reduce((n, e) => n + flaggedLabs(e).length, 0),
      "Results to review",
    )}</div><div class="sec"><h3>Needs attention</h3>${f.length ? f.map(patientRow).join("") : emptyNote("Nothing needs attention right now. Patients show up here once they share records with your ID.")}</div>`;
  },
  hd() {
    const i = sharedWithMe(),
      f = i.filter((e) => flaggedLabs(e).length),
      d = linkedDoctors();
    return `<h2>${tabText("hd")}</h2><p class="m">${escapeHtml(currentUser().name)} · Facility ID ${escapeHtml(currentUser().id)}</p><div class="stats">${statCard(i.length, "Patients sharing with this hospital")}${statCard(d.length, "Linked doctors")}${statCard(f.length, "Patients with out-of-range results")}</div><div class="sec"><h3>Recently shared</h3>${i.slice(0, 5).map(patientRow).join("") || emptyNote("Nobody has shared yet. Patients can share using your facility ID or a linked doctor's ID.")}</div>`;
  },
  pts() {
    const i = sharedWithMe(),
      e = openPatientKey && i.find((x) => patientKey(x) == openPatientKey),
      patients = state.patients || [];
    return (
      `<h2>${tabText("pts")}</h2>` +
      `<div class="sec"><h3>Add a patient</h3><p class="m">Manual entries stay in this browser and do not create a patient login. Do not enter real patient information in this demo.</p><form data-f="localPatient">${fieldHtml("name", "Patient name", "text", "required")}${fieldHtml("ref", "Patient ID or reference")}${fieldHtml("age", "Age", "number", 'min="0" max="120"')}${fieldHtml("phone", "Contact number", "tel")}${fieldHtml("notes", "Notes or reason for visit")}<button class="b">Add patient</button></form></div>` +
      (e ? patientDetail(e) : "") +
      `<div class="sec"><h3>Patients added here</h3>${patients.length ? patients.map(localPatientRow).join("") : emptyNote("No patients added yet.")}</div>` +
      `<div class="sec"><h3>Records shared with you</h3>${i.length ? i.map(patientRow).join("") : emptyNote("No records shared yet. Patients can share from ABHA & sharing using your ID: " + escapeHtml(currentUser().id))}</div>`
    );
  },
  stf() {
    const d = readInbox();
    const doctors = linkedDoctors(),
      directory = state.staff || [];
    return `<h2>${tabText("stf")}</h2><div class="sec"><h3>Add a doctor</h3><p class="m">Directory entries do not create sign-in accounts. Doctors link an account by entering your facility ID (${escapeHtml(currentUser().id)}) when they register.</p><form data-f="localStaff">${fieldHtml("name", "Doctor name", "text", "required")}${fieldHtml("doctorId", "Doctor ID or reference", "text", "required")}${fieldHtml("spec", "Speciality")}${fieldHtml("phone", "Contact number", "tel")}<button class="b">Add doctor</button></form></div><div class="sec"><h3>Doctors added to this directory</h3>${directory.length ? directory.map((x) => `<div class="row"><div><b>${escapeHtml(x.name)}</b><span class="m">${escapeHtml(x.spec || "")} · ${escapeHtml(x.doctorId)}${x.phone ? " · " + escapeHtml(x.phone) : ""}</span></div><button class="x" data-a="remove-local-staff" data-i="${escapeHtml(x.id)}">Remove</button></div>`).join("") : emptyNote("No doctors added yet.")}</div><div class="sec"><h3>Linked doctor accounts</h3>${doctors.map((x) => `<div class="row"><div><b>${escapeHtml(x.name)}</b><span class="m">${escapeHtml(x.spec || "")} · ${escapeHtml(x.id)}</span></div><span class="m">${(d[x.id] || []).length} shared patients</span></div>`).join("") || emptyNote("No doctor accounts are linked yet. Doctors link during registration using your facility ID.")}</div>`;
  },
  ref() {
    return `<h2>${tabText("ref")}</h2><div class="sec">${Object.values(LAB_TESTS)
      .map(
        (x) =>
          `<div class="row"><div><b>${x[0]}</b> <span class="m">usual ${x[2]}–${x[3]} ${x[1]}</span><div class="m">Low: ${x[4] || "–"}<br>High: ${x[5] || "–"}</div></div></div>`,
      )
      .join(
        "",
      )}</div><p class="dis">These are general adult ranges. For decisions, go by the range on the lab's own report.</p>`;
  },
});
