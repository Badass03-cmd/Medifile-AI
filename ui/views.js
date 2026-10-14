// One render function per tab, plus renderApp().

// One render function per tab; each returns an HTML string.
const views = {
  dash() {
    const lt = latestLabs(),
      ab = lt.filter((x) => labFlag(x.k, x.v) != "Normal"),
      n = nextAppointment(),
      w = toDateKey(new Date(Date.now() - 6 * 864e5)),
      sy = state.syms.filter((s) => s.d >= w),
      av = sy.length ? (sy.reduce((a, s) => a + +s.sev, 0) / sy.length).toFixed(1) : "–",
      age = +state.emg.age || 0;
    const tips = [
      "Get your blood pressure checked at least once a year.",
      "Stay on top of your vaccinations. Ask your doctor which ones are due.",
      "Try for around 150 minutes of moderate activity a week. A brisk walk counts.",
    ];
    if (age >= 40) tips.push("At 40 and over, ask your doctor about yearly blood sugar and cholesterol checks.");
    if (age >= 50)
      tips.push("At 50 and over, chat with your doctor about cancer and bone-health screening.");
    return `<h2>${tabText("dash")}</h2>${dashHero()}${moodCard()}<div class="stats"><div class="st"><b>${weeklyAdherence()}</b><span class="m">Doses taken this week</span></div><div class="st"><b>${n ? formatDate(n.dt) : "Nothing booked"}</b><span class="m">${n ? "Next visit: " + escapeHtml(n.doc) : "No visit coming up"}</span></div><div class="st"><b>${ab.length}</b><span class="m">Results to discuss with your doctor</span></div><div class="st"><b>${av}</b><span class="m">Average discomfort this week (out of 10)</span></div>${vitalsStat()}</div>
<div class="sec"><h3>Today's medicines</h3>${doseRowsHtml()}</div>
<div class="sec"><h3>Worth a closer look</h3>${ab.length ? ab.map((x) => `<div class="row"><div>${LAB_TESTS[x.k][0]}: <b>${x.v} ${LAB_TESTS[x.k][1]}</b> <span class="tag ${labFlag(x.k, x.v)}">${flagWord(labFlag(x.k, x.v))}</span></div></div>`).join("") : emptyNote("All clear for now. Add your test results and I will keep watch for you.")}</div>
<div class="sec"><h3>Looking after yourself</h3><ul>${tips.map((x) => `<li>${x}</li>`).join("")}</ul>${age ? "" : '<p class="m">Add your age under Emergency info to get tips made for you.</p>'}</div>
<div class="sec np"><h3>Your information</h3><p class="m">Everything stays in this browser, on this device. Save a backup now and then so nothing gets lost.</p><button class="g" data-a="export">Save a backup</button> <button class="g" data-a="csv">Export readings (CSV)</button> <label class="g" style="display:inline-block;cursor:pointer;margin:0">Restore a backup<input type="file" accept=".json" data-imp style="display:none"></label> <button class="x" data-a="wipe">Erase everything</button></div>`;
  },
  ai() {
    return `<h2>${tabText("ai")}</h2><div class="sec"><div class="chat" id="chat">${state.chat.length ? state.chat.map((m) => `<div class="msg ${m.r}">${escapeHtml(m.t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</div>`).join("") : '<div class="msg">Hi there! 👋 I am MediFile AI. Ask me about a test result, how you feel, your medicines, healthy habits or first aid, in simple words. Tap a suggestion below or type your own question.</div>'}</div>
<div class="chips">${chipList().map((q) => `<button class="g" data-a="ask" data-q="${q}">${q}</button>`).join("")}</div>
<form data-f="chat" style="display:flex;gap:8px;align-items:center"><input name="q" placeholder="Try: why is my sugar high?" autocomplete="off" required><button class="b">Send</button>${window.SpeechRecognition || window.webkitSpeechRecognition ? '<button type="button" class="g" data-a="mic" aria-label="Speak your question" title="Speak your question">🎤</button>' : ""}${window.speechSynthesis && state.chat.some((m) => m.r == "a") ? '<button type="button" class="g" data-a="speak" aria-label="Read the last answer aloud" title="Read the last answer aloud">🔊</button>' : ""}</form></div>${state.chat.length ? '<p class="np"><button type="button" class="g" data-a="clearchat">Clear chat</button></p>' : ""}<p class="dis">I run right here on your device and share general health information. I can help you understand things, but I cannot diagnose. Your doctor is the one to ask about that. Summaries follow the language chosen at the top; my other replies are in English.</p>`;
  },
  rec() {
    return `<h2>${tabText("rec")}</h2><div class="sec"><form data-f="rec">${fieldHtml("title", "Name this document", "text", "required")}<label>Type<select name="type"><option>Prescription</option><option>Lab report</option><option>Imaging</option><option>Vaccination</option><option>Discharge summary</option><option>Other</option></select></label>${fieldHtml("d", "Date", "date", 'value="' + toDateKey(new Date()) + '"')}${fieldHtml("doc", "Doctor or hospital")}${fieldHtml("n", "Notes")}${fieldHtml("file", "Attach a file (up to 400 KB)", "file")}<button class="b">Save document</button></form></div>
<div class="sec"><input placeholder="Search your documents" aria-label="Search your documents" data-q style="margin-bottom:8px"><div class="chips np">${["", "Prescription", "Lab report", "Imaging", "Vaccination", "Discharge summary"].map((t) => `<button type="button" class="g" data-a="rfilter" data-v="${t}">${t || "All"}</button>`).join("")}</div>${
      state.recs.length
        ? [...state.recs]
            .sort((a, b) => (a.d < b.d ? 1 : -1))
            .map(
              (r) =>
                `<div class="row" data-s="${escapeHtml((r.title + r.type + r.doc + r.n).toLowerCase())}"><div><b>${escapeHtml(r.title)}</b> <span class="tag">${escapeHtml(r.type)}</span><div class="m">${formatDate(r.d)} ${escapeHtml(r.doc)} ${escapeHtml(r.n)}</div>${r.f ? `<a href="${r.f}" download="${escapeHtml(r.fn)}">Open ${escapeHtml(r.fn)}</a>` : ""}</div>${deleteButton("recs", r.id)}</div>`,
            )
            .join("")
        : emptyNote(
            "Nothing saved yet. Keep your prescriptions, reports and vaccination history here.",
          )
    }</div>`;
  },
  med() {
    return `<h2>${tabText("med")}</h2><div class="sec"><form data-f="med">${fieldHtml("name", "Medicine name", "text", "required")}${fieldHtml("dose", "Dose (e.g. 500 mg)")}${fieldHtml("times", "What time do you take it? (e.g. 08:00, 20:00)", "text", "required")}${fieldHtml("note", "Notes (e.g. after food)")}${fieldHtml("stock", "Tablets left (optional, for refill alerts)", "number", 'min="0"')}<button class="b">Add medicine</button></form><p class="m np">I will remind you while this page is open. <button class="g" data-a="notif">Turn on notifications</button></p></div>
<div class="sec"><h3>Today</h3>${doseRowsHtml()}</div>${weekStrip()}<div class="sec"><h3>Your medicines</h3>${state.meds.length ? state.meds.map((m) => `<div class="row"><div><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.dose)}<div class="m">${m.times.join(", ")} ${escapeHtml(m.note || "")}</div>${stockHtml(m)}</div>${deleteButton("meds", m.id)}</div>`).join("") : emptyNote("No medicines added yet.")}</div>`;
  },
  lab() {
    const g = {};
    state.labs.forEach((x) => (g[x.k] = g[x.k] || []).push(x));
    return `<h2>${tabText("lab")}</h2><div class="sec"><form data-f="lab"><label>Test<select name="k">${Object.entries(
      LAB_TESTS,
    )
      .map(([k, v]) => `<option value="${k}">${v[0]} (${v[1]})</option>`)
      .join(
        "",
      )}</select></label>${fieldHtml("v", "Your result", "number", 'step="any" required')}${fieldHtml("d", "Date", "date", 'value="' + toDateKey(new Date()) + '" required')}<button class="b">Add result</button></form></div>
${
  Object.keys(g).length
    ? Object.entries(g)
  .map(([k, a]) => {
    a.sort((x, y) => (x.d < y.d ? -1 : 1));
    const l = a[a.length - 1],
      f = labFlag(k, l.v),
      ex =
        f == "Low"
          ? LAB_TESTS[k][4]
          : f == "High"
            ? LAB_TESTS[k][5]
            : "This is within the usual range for adults. Good news.";
    return `<div class="sec"><h3>${LAB_TESTS[k][0]} <span class="tag ${f}">${flagWord(f)}</span></h3><p>Latest <b>${l.v} ${LAB_TESTS[k][1]}</b> on ${formatDate(l.d)}. Usual range ${LAB_TESTS[k][2]}–${LAB_TESTS[k][3]}. ${ex || ""}</p>${
      a.length > 1
        ? sparkline(
            a.map((x) => ({ d: x.d, v: x.v })),
            LAB_TESTS[k][2],
            LAB_TESTS[k][3],
          )
        : '<p class="m">Add one more result to see how it is changing.</p>'
    }${a
      .slice()
      .reverse()
      .map(
        (x) =>
          `<div class="row"><div class="m">${formatDate(x.d)}: ${x.v} ${LAB_TESTS[k][1]}</div>${deleteButton("labs", x.id)}</div>`,
      )
      .join("")}</div>`;
  })
  .join("")
    : emptyNote("No results yet. Whenever you get a report, add it here and I will explain it in plain words 🧪")
}<p class="dis">These are general ranges for adults. Labs can vary, so go by the range printed on your report and what your doctor tells you.</p>`;
  },
  app() {
    const a = [...state.appts].sort((x, y) => (x.dt < y.dt ? -1 : 1));
    return `<h2>${tabText("app")}</h2><div class="sec"><form data-f="app">${fieldHtml("doc", "Doctor", "text", "required")}${fieldHtml("spec", "Speciality")}${fieldHtml("dt", "Date and time", "datetime-local", "required")}${fieldHtml("why", "Reason for the visit")}<button class="b">Add visit</button></form></div>
<div class="sec">${a.length ? a.map((x) => `<div class="row"><div><b>${formatDate(x.dt)}</b> ${x.dt < nowStamp() ? '<span class="tag">Past</span> ' : ""}${escapeHtml(x.doc)} <span class="m">${escapeHtml(x.spec)}</span><div class="m">${escapeHtml(x.why)}</div></div><button class="g np" data-a="prep" data-i="${x.id}">Get ready for this visit</button><button class="g np" data-a="ics" data-i="${x.id}">Add to calendar</button>${deleteButton("appts", x.id)}</div>`).join("") : emptyNote("No visits booked. Add one and I will remind you and prepare a summary to take along.")}</div>`;
  },
  sym() {
    const s = [...state.syms].sort((a, b) => (a.d < b.d ? 1 : -1)),
      c = {};
    state.syms.forEach((x) => {
      const k = x.s.toLowerCase();
      c[k] = (c[k] || 0) + 1;
    });
    const top = Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return `<h2>${tabText("sym")}</h2><div class="sec"><form data-f="sym">${fieldHtml("s", "What are you feeling?", "text", "required")}<label>How bad is it? <output>5</output>/10<input name="sev" type="range" min="1" max="10" value="5" oninput="this.previousSibling.previousSibling.value=this.value"></label>${fieldHtml("d", "Date", "date", 'value="' + toDateKey(new Date()) + '" required')}${fieldHtml("n", "Notes")}<button class="b">Save how I feel</button></form></div>
${
  top.length
    ? `<div class="sec"><h3>What I am noticing</h3>${top
  .map(([k, n]) => {
    const a = state.syms
      .filter((x) => x.s.toLowerCase() == k)
      .sort((x, y) => (x.d < y.d ? -1 : 1));
    return `<p><b>${escapeHtml(k)}</b> noted ${n} time${n > 1 ? "s" : ""}, averaging ${(a.reduce((q, x) => q + +x.sev, 0) / n).toFixed(1)}/10.</p>${a.length > 1 ? sparkline(a.map((x) => ({ d: x.d, v: +x.sev }))) : ""}`;
  })
  .join("")}</div>`
    : ""
}
<div class="sec">${s.length ? s.map((x) => `<div class="row"><div><b>${escapeHtml(x.s)}</b> ${x.sev}/10 <span class="m">${formatDate(x.d)} ${escapeHtml(x.n)}</span></div>${deleteButton("syms", x.id)}</div>`).join("") : emptyNote("Nothing logged yet. When something feels off, note it here.")}</div>`;
  },
  emg() {
    const e = state.emg;
    return `<h2>${tabText("emg")}</h2><div class="sec"><p class="red"><b>In an emergency, call 112 (India) · 911 (US) · 999 (UK). Ambulance in India: 108.</b></p></div><div class="sec"><form data-f="emg">${fieldHtml("name", "Full name", "text", 'value="' + escapeHtml(e.name) + '"')}${fieldHtml("age", "Age", "number", 'min="0" max="120" value="' + escapeHtml(e.age) + '"')}${fieldHtml("blood", "Blood group", "text", 'value="' + escapeHtml(e.blood) + '"')}${fieldHtml("allergies", "Allergies", "text", 'value="' + escapeHtml(e.allergies) + '"')}${fieldHtml("cond", "Health conditions", "text", 'value="' + escapeHtml(e.cond) + '"')}${fieldHtml("c1", "Emergency contact 1 (name, phone)", "text", 'value="' + escapeHtml(e.c1) + '"')}${fieldHtml("c2", "Emergency contact 2 (name, phone)", "text", 'value="' + escapeHtml(e.c2) + '"')}${fieldHtml("doc", "Doctor (name, phone)", "text", 'value="' + escapeHtml(e.doc) + '"')}<button class="b">Save my details</button></form></div>
<div class="sec"><div class="print-brand"><img src="${LOGO.mark}" alt="" width="54" height="41"><b>MediFile · Emergency card</b></div><h3>Your emergency card</h3>${["name", "age", "blood", "allergies", "cond", "c1", "c2", "doc"].map((k) => `<div class="row"><div class="m" style="flex:0 0 130px">${{ name: "Name", age: "Age", blood: "Blood group", allergies: "Allergies", cond: "Conditions", c1: "Contact 1", c2: "Contact 2", doc: "Doctor" }[k]}</div><div>${escapeHtml(e[k]) || "–"}</div></div>`).join("")}<p class="np"><button class="g" data-a="print">Print my card</button></p></div>`;
  },
};
// Redraws the nav and the current tab.
function renderApp() {
  qs("#lang").value = state.lang;
  document.documentElement.lang = state.lang;
  qs("#nav").innerHTML = TAB_ORDER.map(
    (k) =>
      `<button data-a="tab" data-t="${k}" class="${state.tab == k ? "on" : ""}"${state.tab == k ? ' aria-current="page"' : ""}>${tabText(k)}</button>`,
  ).join("");
  qs("#main").dataset.t = state.tab;
  qs("#main").innerHTML = views[state.tab]();
  const c = qs("#chat");
  if (c) c.scrollTop = c.scrollHeight;
}
