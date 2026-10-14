// Small helpers used all over the app (dates, labs, doses, sparkline...).

const qs = (s) => document.querySelector(s),
  escapeHtml = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const pad2 = (n) => String(n).padStart(2, "0"),
  toDateKey = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()),
  newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const tabText = (k) => (translations[state.lang] || translations.en)[k] || translations.en[k],
  saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("I could not save that. This browser's storage is full or blocked.");
    }
  };
function applyDisplaySettings() {
  document.documentElement.dataset.theme = state.theme || "system";
  document.documentElement.dataset.size = state.size || "normal";
  if (qs("#theme")) qs("#theme").value = state.theme || "system";
  if (qs("#size")) qs("#size").value = state.size || "normal";
}
function showToast(m, act) {
  const d = document.createElement("div");
  d.append(document.createTextNode(m));
  if (act) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-act";
    b.textContent = act.label;
    b.onclick = () => {
      act.fn();
      d.remove();
    };
    d.append(b);
  }
  qs("#toast").append(d);
  while (qs("#toast").children.length > 3) qs("#toast").firstChild.remove();
  setTimeout(() => d.remove(), act ? 8000 : 6000);
}
const fieldHtml = (n, l, ty = "text", x = "") =>
  `<label>${l}<input name="${n}" type="${ty}" ${x}></label>`;
const formatDate = (s) =>
  s
    ? new Date(s).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: s.includes("T") ? "short" : undefined,
      })
    : "";
const nowStamp = () => {
  const d = new Date();
  return toDateKey(d) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
};
const flagWord = (f) => ({ Low: "Below usual", High: "Above usual", Normal: "In range" })[f] || f;
const labFlag = (k, v) =>
  v < LAB_TESTS[k][2] ? "Low" : v > LAB_TESTS[k][3] ? "High" : "Normal";
const latestLabs = () => {
  const m = {};
  [...state.labs].sort((a, b) => (a.d < b.d ? -1 : 1)).forEach((x) => (m[x.k] = x));
  return Object.values(m);
};
const allDoses = () =>
  state.meds
    .flatMap((m) => m.times.map((tm) => ({ m, tm, key: m.id + "@" + tm })))
    .sort((a, b) => (a.tm < b.tm ? -1 : 1));
const isDoseTaken = (k, d = toDateKey(new Date())) => !!(state.log[d] || {})[k];
const nextAppointment = () =>
  state.appts.filter((a) => a.dt >= nowStamp()).sort((a, b) => (a.dt < b.dt ? -1 : 1))[0];
function sparkline(p, lo, hi) {
  if (!p.length) return "";
  const W = 300,
    H = 70,
    vs = p.map((x) => x.v),
    mn = Math.min(lo ?? 1e9, ...vs),
    mx = Math.max(hi ?? -1e9, ...vs),
    r = mx - mn || 1,
    y = (v) => H - 6 - ((v - mn) / r) * (H - 12),
    x = (i) => (p.length > 1 ? 10 + (i * (W - 20)) / (p.length - 1) : W / 2);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Trend">`;
  if (lo != null)
    s += `<rect x="0" y="${y(hi)}" width="${W}" height="${Math.max(2, y(lo) - y(hi))}" fill="var(--sf)"/>`;
  s += `<polyline fill="none" stroke="var(--ac)" stroke-width="2" points="${p.map((q, i) => x(i) + "," + y(q.v)).join(" ")}"/>`;
  p.forEach(
    (q, i) =>
      (s += `<circle cx="${x(i)}" cy="${y(q.v)}" r="3.5" fill="var(--ac)"><title>${q.d}: ${q.v}</title></circle>`),
  );
  return s + "</svg>";
}
const deleteButton = (c, id) =>
  `<button class="x np" data-a="del" data-c="${c}" data-i="${id}" aria-label="Delete">Remove</button>`;
const emptyNote = (m) => `<p class="m">${m}</p>`;
const dueDoses = () => {
  const n = new Date(), hm = pad2(n.getHours()) + ":" + pad2(n.getMinutes());
  return allDoses().filter((x) => x.tm <= hm && !isDoseTaken(x.key));
};
const dueButton = () => {
  const n = dueDoses().length;
  return n ? `<p class="np" style="margin:10px 0 0"><button class="g" data-a="takedue">Mark ${n} due dose${n > 1 ? "s" : ""} as taken</button></p>` : "";
};
function dashHero() {
  const u = currentUser(), now = new Date(), h = now.getHours(),
    hi = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    first = escapeHtml(((u && u.name) || state.emg.name || "").split(" ")[0]),
    all = allDoses(), done = all.filter((x) => isDoseTaken(x.key)).length,
    hm = pad2(h) + ":" + pad2(now.getMinutes()),
    pend = all.filter((x) => !isDoseTaken(x.key)),
    nx = pend.find((x) => x.tm >= hm) || pend[0],
    late = pend.filter((x) => x.tm < hm).length,
    pct = all.length ? Math.round((done / all.length) * 100) : 0;
  let sub;
  if (!all.length) sub = "Add your medicines and I will remind you when each dose is due.";
  else if (!pend.length) sub = "All " + all.length + " dose" + (all.length > 1 ? "s" : "") + " taken today. Well done.";
  else
    sub = done + " of " + all.length + " doses taken today. " + (nx.tm >= hm ? "Next: " : "Overdue: ") + nx.tm + " " + escapeHtml(nx.m.name) + (nx.m.dose ? " " + escapeHtml(nx.m.dose) : "") + "." +
      (late && nx.tm >= hm ? " " + late + " earlier dose" + (late > 1 ? "s" : "") + " not marked yet." : "");
  return `<div class="hero"><div><p class="hero-hi"><span aria-hidden="true">${h < 6 ? "🌙" : h < 12 ? "☀️" : h < 17 ? "🌤️" : h < 21 ? "🌇" : "🌙"}</span> ${hi}${first ? ", " + first : ""}</p><p class="m">${now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>${all.length ? `<div class="prog" role="progressbar" aria-label="Doses taken today" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>` : ""}<p class="hero-sub">${sub}${streakHtml()}</p><p class="hero-note">💛 ${dailyThought()}</p>${lowStock().length ? `<p class="hero-sub"><b>Refill soon:</b> ${lowStock().map((m) => escapeHtml(m.name) + " (about " + stockDays(m) + " day" + (stockDays(m) == 1 ? "" : "s") + " left)").join(", ")}.</p>` : ""}</div><div class="quick np"><button class="b" data-a="tab" data-t="sym">Log how I feel</button><button class="g" data-a="tab" data-t="med">Add medicine</button><button class="g" data-a="tab" data-t="vit">Add a reading</button><button class="g" data-a="tab" data-t="lab">Add test result</button><button class="g" data-a="tab" data-t="scan">Scan a document</button><button class="g" data-a="tab" data-t="ai">Ask MediFile AI</button></div></div>`;
}
function doseRowsHtml() {
  const d = allDoses();
  return d.length
    ? d
        .map(
          (x) =>
            `<label class="row" style="color:var(--ink);font-size:15px"><input type="checkbox" style="width:auto" data-dose="${x.key}" ${isDoseTaken(x.key) ? "checked" : ""}><div><b>${x.tm}</b> ${escapeHtml(x.m.name)} ${escapeHtml(x.m.dose)} <span class="m">${escapeHtml(x.m.note || "")}</span></div></label>`,
        )
        .join("") + dueButton()
    : emptyNote("No medicines yet. If you take any, add them under My medicines and I will gently remind you 💊");
}
function weeklyAdherence() {
  const d = allDoses();
  if (!d.length) return "–";
  let e = 0,
    k = 0;
  for (let i = 0; i < 7; i++) {
    const dt = toDateKey(new Date(Date.now() - i * 864e5));
    d.forEach((x) => {
      e++;
      if (isDoseTaken(x.key, dt)) k++;
    });
  }
  return Math.round((k / e) * 100) + "%";
}
