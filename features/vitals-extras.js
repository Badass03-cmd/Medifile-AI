// Vitals, refills, weekly adherence, CSV / calendar export, voice.

Object.assign(translations.te, { vit: "ఆరోగ్య రీడింగ్‌లు" });
const VITALS = {
  bp: ["Blood pressure", "mmHg"],
  pulse: ["Pulse", "bpm"],
  spo2: ["Oxygen level (SpO₂)", "%"],
  temp: ["Temperature", "°C"],
  sugar: ["Blood sugar", "mg/dL"],
  weight: ["Weight", "kg"],
};
const SANE = { bp: [50, 300], pulse: [20, 250], spo2: [50, 100], temp: [30, 45], sugar: [20, 800], weight: [1, 400] };
const SUGAR_CTX = { fasting: "fasting", after: "after a meal", random: "any time" };
const VFLAG_WORD = { Normal: "In range", Low: "Below usual", Elevated: "A little high", High: "Above usual", Urgent: "Very far from usual" };
function vitFlag(x) {
  const v = x.v;
  if (x.t == "bp") {
    const d = x.v2;
    if (v >= 180 || d >= 120) return "Urgent";
    if (v < 90 || d < 60) return "Low";
    if (v >= 140 || d >= 90) return "High";
    if (v >= 120 || d >= 80) return "Elevated";
    return "Normal";
  }
  if (x.t == "pulse") return v < 40 || v > 130 ? "Urgent" : v < 60 ? "Low" : v > 100 ? "High" : "Normal";
  if (x.t == "spo2") return v < 90 ? "Urgent" : v < 95 ? "Low" : "Normal";
  if (x.t == "temp") return v < 35 || v >= 39.5 ? "Urgent" : v < 36.1 ? "Low" : v <= 37.2 ? "Normal" : v < 38 ? "Elevated" : "High";
  if (x.t == "sugar") {
    if (v < 54 || v >= 300) return "Urgent";
    if (v < 70) return "Low";
    if (x.c == "fasting" || !x.c) return v < 100 ? "Normal" : v < 126 ? "Elevated" : "High";
    return v < 140 ? "Normal" : v < 200 ? "Elevated" : "High";
  }
  return "";
}
const vitText = (x) =>
  x.t == "bp" ? x.v + "/" + x.v2 + " mmHg"
  : x.t == "temp" ? x.v + " °C (" + (x.v * 9 / 5 + 32).toFixed(1) + " °F)"
  : x.v + " " + VITALS[x.t][1] + (x.t == "sugar" && x.c ? ", " + SUGAR_CTX[x.c] : "");
const vitsSorted = () => [...state.vits].sort((a, b) => (a.d < b.d ? -1 : 1));
const latestVit = (t) => vitsSorted().filter((x) => x.t == t).pop();
function vitalsStat() {
  const x = latestVit("bp") || vitsSorted().pop();
  if (!x) return "";
  return `<div class="st"><b>${x.t == "bp" ? x.v + "/" + x.v2 : x.v}</b><span class="m">Latest ${VITALS[x.t][0].toLowerCase()}${x.t == "bp" ? "" : " (" + VITALS[x.t][1] + ")"}</span></div>`;
}
function vitalsText() {
  const out = Object.keys(VITALS).map((t) => latestVit(t)).filter(Boolean);
  return out.length ? out.map((x) => "• " + VITALS[x.t][0] + ": " + vitText(x) + " (" + x.d.slice(0, 10) + ")").join("\n") : "• none logged";
}
const VIT_ADVICE = {
  Low: "This is below the usual range. If you feel dizzy, weak or unwell, tell your doctor.",
  Elevated: "A little above the usual range. Keep an eye on it and mention it at your next visit.",
  High: "This is above the usual range. If it stays this way across a few readings, please see your doctor.",
  Urgent: "This is very far from the usual range. If you feel unwell, have chest pain or trouble breathing, call 112 or go to the nearest hospital now. Otherwise, repeat the reading after resting and call your doctor.",
  Normal: "In the usual range for adults.",
};
function bmiHtml() {
  const w = latestVit("weight"), h = +state.height;
  if (!w || !(h > 0)) return "";
  const b = w.v / Math.pow(h / 100, 2),
    cat = b < 18.5 ? "below the usual range" : b < 25 ? "in the usual range" : b < 30 ? "above the usual range" : "well above the usual range";
  return `<p>Your BMI is <b>${b.toFixed(1)}</b>, ${cat}. This is a rough guide for adults. Ask your doctor what is right for you.</p>`;
}
Object.assign(views, {
  vit() {
    const all = vitsSorted(), by = {};
    all.forEach((x) => (by[x.t] = by[x.t] || []).push(x));
    const week = toDateKey(new Date(Date.now() - 6 * 864e5)),
      bpw = (by.bp || []).filter((x) => x.d.slice(0, 10) >= week);
    const cards = Object.keys(VITALS).filter((t) => by[t]).map((t) => {
      const l = by[t][by[t].length - 1], f = vitFlag(l);
      return `<div class="st"><b>${t == "bp" ? l.v + "/" + l.v2 : l.v}</b><span class="m">${VITALS[t][0]}${t == "bp" ? "" : " (" + VITALS[t][1] + ")"}</span>${f ? `<div><span class="tag ${f}">${VFLAG_WORD[f]}</span></div>` : ""}</div>`;
    });
    const sections = Object.keys(VITALS).filter((t) => by[t]).map((t) => {
      const a = by[t], l = a[a.length - 1], f = vitFlag(l);
      const pts = a.slice(-14).map((x) => ({ d: x.d, v: x.v }));
      const rng = { bp: [90, 129], pulse: [60, 100], spo2: [95, 100], temp: [36.1, 37.2] }[t] || [];
      return `<div class="sec"><h3>${VITALS[t][0]} ${f ? `<span class="tag ${f}">${VFLAG_WORD[f]}</span>` : ""}</h3><p>Latest <b>${vitText(l)}</b> on ${formatDate(l.d)}. ${f ? VIT_ADVICE[f] : ""}</p>${t == "bp" && bpw.length > 1 ? `<p class="m">7-day average: ${Math.round(bpw.reduce((s, x) => s + x.v, 0) / bpw.length)}/${Math.round(bpw.reduce((s, x) => s + x.v2, 0) / bpw.length)} from ${bpw.length} readings.</p>` : ""}${t == "weight" ? bmiHtml() : ""}${a.length > 1 ? `<p class="m" style="margin-bottom:0">${t == "bp" ? "Upper number, last " : "Last "}${pts.length} readings</p>` + sparkline(pts, rng[0], rng[1]) : '<p class="m">Add one more reading to see how it is changing.</p>'}${a.slice(-8).reverse().map((x) => `<div class="row"><div class="m">${formatDate(x.d)}: ${vitText(x)}${x.n ? " · " + escapeHtml(x.n) : ""}</div>${deleteButton("vits", x.id)}</div>`).join("")}</div>`;
    });
    return `<h2>${tabText("vit")}</h2><div class="sec"><form data-f="vit"><label>What did you measure?<select name="t" id="vtype">${Object.entries(VITALS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></label><label><span data-vl>Upper number (systolic)</span><input name="v" type="number" step="any" min="0" required></label><label data-bp>Lower number (diastolic)<input name="v2" type="number" step="any" min="0" required></label><label data-sug hidden>When was it taken?<select name="c" disabled><option value="fasting">Fasting (before eating)</option><option value="after">After a meal</option><option value="random">Any other time</option></select></label>${fieldHtml("d", "Date and time", "datetime-local", 'value="' + nowStamp() + '" required')}${fieldHtml("n", "Notes (optional)")}<button class="b">Add reading</button></form></div>
<div class="sec"><form data-f="height" style="grid-template-columns:1fr auto"><label>Your height in cm (used for BMI)<input name="h" type="number" min="50" max="260" value="${escapeHtml(state.height || "")}"></label><button class="g">Save height</button></form></div>
${cards.length ? `<div class="stats">${cards.join("")}</div>` : ""}${sections.join("") || emptyNote("Nothing here yet 🌱 Add your first reading above. After that I will show you how things change over time.")}<p class="dis">These are general adult ranges, not a diagnosis. Home devices can be off, so go by your doctor's advice.</p>`;
  },
});
// Refill tracking
const stockDays = (m) => Math.floor(m.stock / Math.max(1, (m.times || []).length));
const lowStock = () => state.meds.filter((m) => m.stock != null && stockDays(m) <= 5);
function adjustStock(key, delta) {
  const m = state.meds.find((x) => x.id == String(key).split("@")[0]);
  if (!m || m.stock == null) return;
  m.stock = Math.max(0, m.stock + delta);
  if (delta < 0 && stockDays(m) <= 5) showToast(m.stock == 0 ? m.name + " has run out. Time to refill." : m.name + ": about " + stockDays(m) + " day" + (stockDays(m) == 1 ? "" : "s") + " left. Time to refill.");
}
function stockHtml(m) {
  const tag = m.stock != null ? `<span class="tag ${stockDays(m) <= 5 ? "Elevated" : "Normal"}">${m.stock} left, about ${stockDays(m)} day${stockDays(m) == 1 ? "" : "s"}</span>` : "";
  return `<div class="stock np">${tag}<label class="m" style="display:inline-flex;align-items:center;gap:6px">${m.stock != null ? "Update" : "Tablets left"}<input type="number" min="0" data-stock="${m.id}" value="${m.stock ?? ""}" placeholder="–" aria-label="Tablets left for ${escapeHtml(m.name)}"></label></div>`;
}
function weekStrip() {
  const d = allDoses();
  if (!d.length) return "";
  let cells = "";
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 864e5), k = toDateKey(dt),
      p = Math.round((d.filter((x) => isDoseTaken(x.key, k)).length / d.length) * 100);
    cells += `<div class="wk"><div class="wkb" role="img" aria-label="${p}% taken"><i style="height:${p}%"></i></div><span class="m">${dt.toLocaleDateString([], { weekday: "short" })}</span><span class="m">${p}%</span></div>`;
  }
  return `<div class="sec"><h3>Last 7 days</h3><div class="wks">${cells}</div></div>`;
}
// Downloads
function downloadFile(name, text, type) {
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([text], { type }));
  l.download = name;
  l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 2000);
}
const csvCell = (s) => (/[",\n]/.test(String(s ?? "")) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s ?? ""));
function exportCsv() {
  const rows = [["Type", "Name", "Value", "Unit", "Date", "Notes"]];
  state.labs.forEach((x) => rows.push(["Lab result", LAB_TESTS[x.k][0], x.v, LAB_TESTS[x.k][1], x.d, ""]));
  state.vits.forEach((x) => rows.push(["Vital", VITALS[x.t][0], x.t == "bp" ? x.v + "/" + x.v2 : x.v, VITALS[x.t][1], x.d, x.n || ""]));
  state.syms.forEach((x) => rows.push(["Symptom", x.s, x.sev, "out of 10", x.d, x.n || ""]));
  Object.entries(state.moods || {}).forEach(([d, v]) => rows.push(["Mood", (MOODS.find((m) => m[0] == v) || [0, "", v])[2], v, "1 to 5", d, ""]));
  if (rows.length == 1) return showToast("Nothing to export yet. Add a result, reading or symptom first.");
  downloadFile("medifile-readings.csv", "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), "text/csv");
  showToast("Readings exported");
}
function exportIcs(a) {
  const f = (d) => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00",
    st = new Date(a.dt), en = new Date(st.getTime() + 36e5),
    esc = (s) => String(s || "").replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MediFile//EN", "BEGIN:VEVENT", "UID:" + a.id + "@medifile", "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d+/g, ""),
    "DTSTART:" + f(st), "DTEND:" + f(en), "SUMMARY:" + esc("Doctor visit: " + a.doc), "DESCRIPTION:" + esc([a.spec, a.why].filter(Boolean).join(". ")),
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Visit in 1 hour", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  downloadFile("visit-" + a.dt.slice(0, 10) + ".ics", ics, "text/calendar");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a == "csv") exportCsv();
  else if (a == "ics") {
    const x = state.appts.find((y) => y.id == b.dataset.i);
    if (x) exportIcs(x);
  } else if (a == "mic") {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.lang = { en: "en-IN", hi: "hi-IN", te: "te-IN" }[state.lang] || "en-IN";
    r.onresult = (ev) => {
      const i = qs("input[name=q]");
      if (i) {
        i.value = ev.results[0][0].transcript;
        i.focus();
      }
    };
    r.onerror = () => showToast("I could not hear that. Please check that the microphone is allowed.");
    r.start();
    showToast("Listening. Say your question.");
  } else if (a == "speak") {
    const m = [...state.chat].reverse().find((x) => x.r == "a");
    if (!m || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(m.t.replace(/\*\*/g, "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, ""));
    u.lang = { en: "en-IN", hi: "hi-IN", te: "te-IN" }[state.lang] || "en-IN";
    speechSynthesis.speak(u);
  }
});
document.addEventListener("change", (e) => {
  const x = e.target;
  if (x.id == "vtype") {
    const f = x.form, t = x.value;
    f.querySelector("[data-bp]").hidden = t != "bp";
    f.querySelector("[name=v2]").disabled = t != "bp";
    f.querySelector("[data-sug]").hidden = t != "sugar";
    f.querySelector("[name=c]").disabled = t != "sugar";
    f.querySelector("[data-vl]").textContent = { bp: "Upper number (systolic)", pulse: "Beats per minute", spo2: "Oxygen level in %", temp: "Temperature in °C or °F", sugar: "Blood sugar in mg/dL", weight: "Weight in kg" }[t];
  } else if ("stock" in x.dataset) {
    const m = state.meds.find((y) => y.id == x.dataset.stock);
    if (!m) return;
    m.stock = x.value === "" ? null : Math.max(0, +x.value);
    saveState();
    renderApp();
    showToast("Stock updated");
  }
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (f.dataset.f == "height") {
    const h = +new FormData(f).get("h");
    if (h && (h < 50 || h > 260)) return showToast("Please enter your height in centimetres, for example 165.");
    state.height = h || "";
    saveState();
    renderApp();
    return showToast("Height saved");
  }
  if (f.dataset.f != "vit") return;
  const d = Object.fromEntries(new FormData(f)), t = d.t;
  let v = +d.v;
  const v2 = d.v2 != null && d.v2 !== "" ? +d.v2 : null;
  if (!(v > 0)) return showToast("Please enter a number for the reading.");
  if (t == "bp" && !(v2 > 0)) return showToast("Please enter both blood pressure numbers.");
  if (t == "temp" && v > 45) v = Math.round(((v - 32) * 50) / 9) / 10;
  const [lo, hi] = SANE[t];
  if (v < lo || v > hi || (t == "bp" && (v2 < 30 || v2 > 200 || v2 >= v)))
    return showToast("That number looks unusual. Please check it and try again.");
  const r = { id: newId(), t, v, d: d.d || nowStamp(), n: d.n || "" };
  if (t == "bp") r.v2 = v2;
  if (t == "sugar") r.c = d.c || "random";
  state.vits.push(r);
  saveState();
  renderApp();
  showToast(vitFlag(r) == "Urgent" ? "That reading is very far from usual. If you feel unwell, call 112 or your doctor now." : vitFlag(r) == "Normal" ? "Saved 👍 That looks good." : "Saved. Thanks for checking, it helps to keep an eye on it.");
});

/* ===== Human touches: mood check-in, streaks, kinder chat ===== */
